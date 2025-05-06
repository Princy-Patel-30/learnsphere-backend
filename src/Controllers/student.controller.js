import prisma from '../config/db.js';

export const createRating = async (req, res) => {
  const { courseId } = req.params;
  const { stars, review } = req.body;
  const user = req.user;

  if (!user?.id) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }

  if (user.role !== 'STUDENT') {
    return res.status(403).json({ message: 'Only students can rate courses' });
  }

  if (!stars || stars < 1 || stars > 5) {
    return res.status(400).json({ message: 'Stars must be between 1 and 5' });
  }

  try {
    const courseIdNum = parseInt(courseId);
    const isEnrolled = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: courseIdNum },
    });

    if (!isEnrolled) {
      return res.status(403).json({ message: 'You must be enrolled to rate this course' });
    }

    const existingRating = await prisma.rating.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: courseIdNum } },
    });

    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this course' });
    }

    const rating = await prisma.rating.create({
      data: {
        userId: user.id,
        courseId: courseIdNum,
        stars,
        review,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ message: 'Rating submitted successfully', rating });
  } catch (error) {
    console.error('Create Rating Error:', error);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
};

export const getCourseRatings = async (req, res) => {
  const { courseId } = req.params;

  try {
    const courseIdNum = parseInt(courseId);
    const ratings = await prisma.rating.findMany({
      where: { courseId: courseIdNum },
      include: {
        user: { select: { id: true, name: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const averageRating = ratings.length
      ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1)
      : 0;

    res.status(200).json({
      ratings,
      averageRating,
      totalRatings: ratings.length,
    });
  } catch (error) {
    console.error('Get Ratings Error:', error);
    res.status(500).json({ message: 'Failed to fetch ratings' });
  }
};

export const addComment = async (req, res) => {
  const { ratingId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }

  if (!content) {
    return res.status(400).json({ message: 'Comment content is required' });
  }

  try {
    const ratingIdNum = parseInt(ratingId);
    const rating = await prisma.rating.findUnique({
      where: { id: ratingIdNum },
      include: { course: { select: { id: true } } },
    });

    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    const isEnrolled = await prisma.enrollment.findFirst({
      where: { userId, courseId: rating.course.id },
    });

    if (!isEnrolled) {
      return res.status(403).json({ message: 'You must be enrolled to comment on this course' });
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        ratingId: ratingIdNum,
        content,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    console.error('Add Comment Error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

export const getComments = async (req, res) => {
  const { ratingId } = req.params;

  try {
    const ratingIdNum = parseInt(ratingId);
    const comments = await prisma.comment.findMany({
      where: { ratingId: ratingIdNum },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error('Get Comments Error:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
};

export const getAllPublishedCourses = async (req, res) => {
  const { category } = req.query;
  try {
    const courses = await prisma.course.findMany({
      where: {
        ...(category ? { category } : {}),
      },
      include: {
        sessions: true,
        instructor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching published courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
};

export const getCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: { sessions: true, instructor: true },
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.status(200).json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Failed to fetch course' });
  }
};

export const enrollInCourse = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
    });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: { userId, courseId: parseInt(courseId) },
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId: parseInt(courseId),
      },
    });

    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Failed to enroll' });
  }
};

export const getEnrolledCourses = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            sessions: true,
            instructor: true,
          },
        },
      },
    });

    const courses = enrollments
      .map(e => e.course)
      .filter(course => course !== null);

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({ message: 'Failed to fetch enrolled courses' });
  }
};

export const getCourseSessions = async (req, res) => {
  const studentId = req.user?.id;
  const courseId = parseInt(req.params.courseId);

  try {
    const isEnrolled = await prisma.enrollment.findFirst({
      where: { userId: studentId, courseId },
    });

    if (!isEnrolled) {
      return res.status(403).json({ message: 'You are not enrolled in this course.' });
    }

    const sessions = await prisma.session.findMany({
      where: { courseId },
    });

    res.status(200).json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
};

export const getCourseProgress = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user?.id;

  try {
    const totalSessions = await prisma.session.count({
      where: { courseId: parseInt(courseId) },
    });

    const completedSessions = await prisma.sessionProgress.count({
      where: {
        userId,
        session: { courseId: parseInt(courseId) },
        completed: true,
      },
    });

    res.status(200).json({
      completedSessions,
      totalSessions,
      progress: totalSessions > 0 ? `${Math.round((completedSessions / totalSessions) * 100)}%` : '0%',
    });
  } catch (error) {
    console.error('Error getting course progress:', error);
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
};

export const markSessionComplete = async (req, res) => {
  const userId = req.user?.id;
  const { sessionId } = req.params;

  try {
    const progress = await prisma.sessionProgress.upsert({
      where: {
        userId_sessionId: {
          userId,
          sessionId,
        },
      },
      update: {
        completed: true,
      },
      create: {
        userId,
        sessionId,
        completed: true,
      },
    });

    res.status(200).json({ message: 'Session marked as completed', progress });
  } catch (error) {
    console.error('Error marking session complete:', error);
    res.status(500).json({ message: 'Failed to mark session complete' });
  }
};

export const postCourseRating = async (req, res) => {
  const { courseId } = req.params;
  const { stars, review } = req.body;
  const user = req.user;

  if (!user?.id) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }

  if (!stars || stars < 1 || stars > 5) {
    return res.status(400).json({ message: 'Stars must be between 1 and 5' });
  }

  try {
    const isEnrolled = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: parseInt(courseId) },
    });

    if (!isEnrolled) {
      return res.status(403).json({ message: 'You must be enrolled to rate this course' });
    }

    const existingRating = await prisma.rating.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: parseInt(courseId) } },
    });

    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this course' });
    }

    const rating = await prisma.rating.create({
      data: {
        userId: user.id,
        courseId: parseInt(courseId),
        stars,
        review,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ message: 'Rating submitted successfully', rating });
  } catch (error) {
    console.error('Student Rating Error:', error);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
};

export const postRatingComment = async (req, res) => {
  const { ratingId } = req.params;
  const { content } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }

  if (!content) {
    return res.status(400).json({ message: 'Comment content is required' });
  }

  try {
    const rating = await prisma.rating.findUnique({
      where: { id: parseInt(ratingId) },
      include: { course: true },
    });

    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    const isEnrolled = await prisma.enrollment.findFirst({
      where: { userId, courseId: rating.course.id },
    });

    if (!isEnrolled) {
      return res.status(403).json({ message: 'You must be enrolled to comment on this rating' });
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        ratingId: parseInt(ratingId),
        content,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    console.error('Student Comment Error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};