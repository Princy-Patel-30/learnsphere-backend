import prisma from '../config/db.js';

export const getAnalytics = async (req, res) => {
  const instructorId = req.user.id;

  try {
    const courses = await prisma.course.findMany({
      where: { instructorId },
      include: {
        enrollments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        sessions: true,
      },
    });

    const analytics = await Promise.all(
      courses.map(async (course) => {
        const totalSessions = course.sessions.length;
        const enrollments = course.enrollments;

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

        return {
          courseId: course.id,
          title: course.title,
          totalEnrollments: enrollments.length,
          completionData,
        };
      })
    );

    res.status(200).json({
      message: 'Analytics fetched successfully',
      analytics,
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};