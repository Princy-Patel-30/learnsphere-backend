import prisma from '../config/db.js';

export const getAnalytics = async (req, res) => {
  const instructorId = req.user.id;

  try {
    const courses = await prisma.course.findMany({
      where: { instructorId },
      include: {
        enrollments: true,
        ratings: true,
        sessions: true,
      },
    });

    // Calculate Key Performance Indicators
    const totalCourses = courses.length;
    const totalEnrollments = courses.reduce((sum, course) => sum + course.enrollments.length, 0);
    
    const totalRating = courses.reduce((sum, course) => {
      if (course.ratings.length === 0) return sum;
      const courseAvg = course.ratings.reduce((s, r) => s + r.stars, 0) / course.ratings.length;
      return sum + courseAvg;
    }, 0);
    const avgRating = totalCourses > 0 ? (totalRating / totalCourses) : 0;

    // Enrollment data for bar chart
    const enrollmentData = courses.map(course => ({
      courseId: course.id,
      title: course.title,
      enrollments: course.enrollments.length,
    }));

    // Rating distribution calculation
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    courses.forEach(course => {
      if (course.ratings.length === 0) return;
      const avgStars = course.ratings.reduce((sum, r) => sum + r.stars, 0) / course.ratings.length;
      const roundedRating = Math.round(avgStars);
      ratingDistribution[roundedRating]++;
    });

    const ratingData = Object.entries(ratingDistribution).map(([stars, count]) => ({
      rating: `${stars} Star${stars > 1 ? 's' : ''}`,
      count,
    }));

    // Course analytics with completion rates
    const courseAnalytics = await Promise.all(courses.map(async (course) => {
      const totalSessions = course.sessions.length;
      let totalCompleted = 0;

      if (totalSessions > 0) {
        totalCompleted = await prisma.sessionProgress.count({
          where: {
            sessionId: { in: course.sessions.map(s => s.id) },
            completed: true,
          },
        });
      }

      const avgCompletionRate = totalSessions > 0 
        ? (totalCompleted / (course.enrollments.length * totalSessions)) * 100 
        : 0;

      const courseAvgRating = course.ratings.length > 0
        ? course.ratings.reduce((sum, r) => sum + r.stars, 0) / course.ratings.length
        : 0;

      return {
        courseId: course.id,
        title: course.title,
        avgCompletionRate: avgCompletionRate.toFixed(2),
        avgRating: courseAvgRating.toFixed(2),
        totalEnrollments: course.enrollments.length,
      };
    }));

    res.status(200).json({
      kpis: {
        totalCourses,
        totalEnrollments,
        avgRating: avgRating.toFixed(2),
      },
      courseAnalytics,
      chartData: {
        enrollments: enrollmentData,
        ratings: ratingData,
      },
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

export const getCourseAnalytics = async (req, res) => {
  const { courseId } = req.params;
  const instructorId = req.user.id;

  try {
    const course = await prisma.course.findFirst({
      where: { id: parseInt(courseId), instructorId },
      include: {
        enrollments: true,
        ratings: true,
        sessions: true,
      },
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const totalSessions = course.sessions.length;
    let totalCompleted = 0;

    if (totalSessions > 0) {
      totalCompleted = await prisma.sessionProgress.count({
        where: {
          sessionId: { in: course.sessions.map(s => s.id) },
          completed: true,
        },
      });
    }

    const avgCompletionRate = totalSessions > 0 
      ? (totalCompleted / (course.enrollments.length * totalSessions)) * 100 
      : 0;

    const avgRating = course.ratings.length > 0
      ? course.ratings.reduce((sum, r) => sum + r.stars, 0) / course.ratings.length
      : 0;

    res.status(200).json({
      course: {
        courseId: course.id,
        title: course.title,
        totalEnrollments: course.enrollments.length,
        avgCompletionRate: avgCompletionRate.toFixed(2),
        avgRating: avgRating.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Course Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch course analytics' });
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
          },
        },
      },
    });

    const commentData = comments.reduce((acc, comment) => {
      const courseId = comment.rating.course.id;
      if (!acc[courseId]) {
        acc[courseId] = {
          courseId,
          courseTitle: comment.rating.course.title,
          totalComments: 0,
        };
      }
      acc[courseId].totalComments++;
      return acc;
    }, {});

    res.status(200).json({
      commentAnalytics: Object.values(commentData),
    });
  } catch (error) {
    console.error('Comment Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch comment analytics' });
  }
};