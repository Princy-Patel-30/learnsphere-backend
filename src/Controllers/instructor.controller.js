import prisma from '../config/db.js';

export const getAnalytics = async (req, res) => {
  const instructorId = req.user.id;

  try {
    // Fetch all courses by the instructor
    const courses = await prisma.course.findMany({
      where: { instructorId },
      include: {
        enrollments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        sessions: true,
        ratings: true,
      },
    });

    // KPI: Total number of created courses
    const totalCourses = courses.length;

    // KPI: Total number of students enrolled
    const totalEnrollments = courses.reduce((sum, course) => sum + course.enrollments.length, 0);

    // KPI: Average completion rate across all courses
    const completionRates = await Promise.all(
      courses.map(async (course) => {
        const totalSessions = course.sessions.length;
        if (totalSessions === 0) return 0;
        const completedSessions = await prisma.sessionProgress.count({
          where: {
            session: { courseId: course.id },
            completed: true,
          },
        });
        const totalPossibleCompletions = course.enrollments.length * totalSessions;
        return totalPossibleCompletions > 0 ? (completedSessions / totalPossibleCompletions) * 100 : 0;
      })
    );
    const avgCompletionRate = completionRates.length > 0
      ? (completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length).toFixed(2)
      : 0;

    // KPI: Total number of ratings and average rating score
    const totalRatings = courses.reduce((sum, course) => sum + course.ratings.length, 0);
    const avgRating = courses.reduce((sum, course) => {
      const courseAvg = course.ratings.length > 0
        ? course.ratings.reduce((s, r) => s + r.stars, 0) / course.ratings.length
        : 0;
      return sum + courseAvg;
    }, 0) / (courses.length || 1);

    // Detailed analytics per course
    const courseAnalytics = await Promise.all(
      courses.map(async (course) => {
        const totalSessions = course.sessions.length;
        const enrollments = course.enrollments;

        // Student-specific completion data
        const completionData = await Promise.all(
          enrollments.map(async (enrollment) => {
            const completedSessions = await prisma.sessionProgress.count({
              where: {
                userId: enrollment.userId,
                session: { courseId: course.id },
                completed: true,
              },
            });
            return {
              user: enrollment.user,
              completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
            };
          })
        );

        // Average rating for the course
        const avgCourseRating = course.ratings.length > 0
          ? (course.ratings.reduce((sum, r) => sum + r.stars, 0) / course.ratings.length).toFixed(2)
          : 0;

        return {
          courseId: course.id,
          title: course.title,
          totalEnrollments: enrollments.length,
          avgCompletionRate: completionData.length > 0
            ? (completionData.reduce((sum, data) => sum + data.completionRate, 0) / completionData.length).toFixed(2)
            : 0,
          avgRating: avgCourseRating,
          completionData,
        };
      })
    );

    // Chart data: Enrollment counts per course
    const enrollmentChartData = {
      labels: courses.map(c => c.title),
      data: courses.map(c => c.enrollments.length),
    };

    // Chart data: Rating distribution (1-5 stars)
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    courses.forEach(course => {
      course.ratings.forEach(rating => {
        ratingDistribution[rating.stars]++;
      });
    });
    const ratingChartData = {
      labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
      data: Object.values(ratingDistribution),
    };

    res.status(200).json({
      message: 'Analytics fetched successfully',
      kpis: {
        totalCourses,
        totalEnrollments,
        avgCompletionRate,
        totalRatings,
        avgRating: avgRating.toFixed(2),
      },
      courseAnalytics,
      chartData: {
        enrollments: enrollmentChartData,
        ratings: ratingChartData,
      },
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

export const getCourseAnalytics = async (req, res) => {
  const instructorId = req.user.id;
  const { courseId } = req.params;

  try {
    const course = await prisma.course.findFirst({
      where: { id: parseInt(courseId), instructorId },
      include: {
        enrollments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        sessions: true,
        ratings: true,
      },
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not owned by instructor' });
    }

    const totalSessions = course.sessions.length;
    const enrollments = course.enrollments;

    // Student-specific completion data
    const completionData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completedSessions = await prisma.sessionProgress.count({
          where: {
            userId: enrollment.userId,
            session: { courseId: course.id },
            completed: true,
          },
        });
        return {
          user: enrollment.user,
          completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        };
      })
    );

    // Average rating for the course
    const avgRating = course.ratings.length > 0
      ? (course.ratings.reduce((sum, r) => sum + r.stars, 0) / course.ratings.length).toFixed(2)
      : 0;

    // Completion rate for the course
    const completedSessions = await prisma.sessionProgress.count({
      where: {
        session: { courseId: course.id },
        completed: true,
      },
    });
    const totalPossibleCompletions = enrollments.length * totalSessions;
    const avgCompletionRate = totalPossibleCompletions > 0
      ? (completedSessions / totalPossibleCompletions * 100).toFixed(2)
      : 0;

    res.status(200).json({
      message: 'Course analytics fetched successfully',
      course: {
        courseId: course.id,
        title: course.title,
        totalEnrollments: enrollments.length,
        avgCompletionRate,
        avgRating,
        completionData,
      },
    });
  } catch (error) {
    console.error('Course Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch course analytics' });
  }
};

export const getStudentAnalytics = async (req, res) => {
  const instructorId = req.user.id;
  const { userId } = req.params;

  try {
    // Fetch enrollments for the student in the instructor's courses
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: parseInt(userId),
        course: { instructorId },
      },
      include: {
        course: {
          include: {
            sessions: true,
            ratings: { where: { userId: parseInt(userId) } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (enrollments.length === 0) {
      return res.status(404).json({ message: 'Student not enrolled in any of your courses' });
    }

    const studentAnalytics = await Promise.all(
      enrollments.map(async (enrollment) => {
        const totalSessions = enrollment.course.sessions.length;
        const completedSessions = await prisma.sessionProgress.count({
          where: {
            userId: enrollment.userId,
            session: { courseId: enrollment.course.id },
            completed: true,
          },
        });
        const completionRate = totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(2) : 0;
        const rating = enrollment.course.ratings[0]?.stars || null;

        return {
          courseId: enrollment.course.id,
          courseTitle: enrollment.course.title,
          completionRate,
          rating,
        };
      })
    );

    res.status(200).json({
      message: 'Student analytics fetched successfully',
      student: {
        id: enrollments[0].user.id,
        name: enrollments[0].user.name,
        email: enrollments[0].user.email,
        courses: studentAnalytics,
      },
    });
  } catch (error) {
    console.error('Student Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch student analytics' });
  }
};

export const getRatingsOverTime = async (req, res) => {
  const instructorId = req.user.id;
  const { startDate, endDate } = req.query;

  try {
    const ratings = await prisma.rating.findMany({
      where: {
        course: { instructorId },
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group ratings by date (e.g., daily)
    const ratingsByDate = ratings.reduce((acc, rating) => {
      const date = rating.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, ratings: [], totalStars: 0, count: 0 };
      }
      acc[date].ratings.push({ courseId: rating.course.id, courseTitle: rating.course.title, stars: rating.stars });
      acc[date].totalStars += rating.stars;
      acc[date].count += 1;
      return acc;
    }, {});

    const chartData = Object.values(ratingsByDate).map((entry) => ({
      date: entry.date,
      avgRating: (entry.totalStars / entry.count).toFixed(2),
      count: entry.count,
    }));

    res.status(200).json({
      message: 'Ratings over time fetched successfully',
      chartData,
    });
  } catch (error) {
    console.error('Ratings Over Time Error:', error);
    res.status(500).json({ message: 'Failed to fetch ratings over time' });
  }
};

export const getCommentAnalytics = async (req, res) => {
  const instructorId = req.user.id;

  try {
    const comments = await prisma.comment.findMany({
      where: {
        rating: { course: { instructorId } },
      },
      include: {
        rating: {
          include: {
            course: { select: { id: true, title: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Group comments by course
    const commentsByCourse = comments.reduce((acc, comment) => {
      const courseId = comment.rating.course.id;
      if (!acc[courseId]) {
        acc[courseId] = {
          courseId,
          courseTitle: comment.rating.course.title,
          comments: [],
          totalComments: 0,
        };
      }
      acc[courseId].comments.push({
        content: comment.content,
        createdAt: comment.createdAt,
        user: comment.rating.user,
      });
      acc[courseId].totalComments += 1;
      return acc;
    }, {});

    const commentAnalytics = Object.values(commentsByCourse);

    res.status(200).json({
      message: 'Comment analytics fetched successfully',
      commentAnalytics,
    });
  } catch (error) {
    console.error('Comment Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch comment analytics' });
  }
};