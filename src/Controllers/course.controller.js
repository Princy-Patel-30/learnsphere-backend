import prisma from '../config/db.js';

export const createCourse = async (req, res) => {
  const { title, description, category, thumbnail, sessions } = req.body;
  const instructorId = req.user.id;

  if (!title || !description || !category || !sessions) {
    return res.status(400).json({ message: 'Title, description, category, and sessions are required' });
  }

  // Validate thumbnail URL if provided
  if (thumbnail && !isValidUrl(thumbnail)) {
    return res.status(400).json({ message: 'Invalid thumbnail URL' });
  }

  try {
    const course = await prisma.course.create({
      data: {
        title,
        description,
        category,
        thumbnail, // Include thumbnail in course creation
        instructorId,
        sessions: {
          create: sessions.map(session => ({
            title: session.title,
            videoUrl: session.youtubeLink,
            content: session.explanation,
          })),
        },
      },
      include: { sessions: true },
    });

    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    console.error('Create Course Error:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
};

export const getInstructorCourses = async (req, res) => {
  const instructorId = req.user.id;
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId },
      include: { sessions: true },
    });
    res.status(200).json(courses);
  } catch (error) {
    console.error('Get Courses Error:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
};

export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, category, thumbnail, sessions, published } = req.body;
  const instructorId = req.user.id;

  try {
    const courseId = parseInt(id);

    const existingCourse = await prisma.course.findFirst({
      where: { id: courseId, instructorId },
      select: { instructorId: true },
    });

    if (!existingCourse) {
      return res.status(403).json({ message: 'You are not authorized to update this course' });
    }

    // Validate thumbnail URL if provided
    if (thumbnail !== undefined && thumbnail !== null && !isValidUrl(thumbnail)) {
      return res.status(400).json({ message: 'Invalid thumbnail URL' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail; // Include thumbnail in update
    if (published !== undefined) updateData.published = published;

    await prisma.$transaction([
      prisma.course.update({
        where: { id: courseId },
        data: updateData,
      }),
      prisma.session.deleteMany({ where: { courseId } }),
      ...(sessions?.length
        ? [
            prisma.session.createMany({
              data: sessions.map(session => ({
                title: session.title,
                videoUrl: session.youtubeLink,
                content: session.explanation,
                courseId,
              })),
            }),
          ]
        : []),
    ]);

    res.status(200).json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Update Course Error:', error);
    res.status(500).json({ message: 'Failed to update course' });
  }
};

export const deleteCourse = async (req, res) => {
  const { id } = req.params;
  const instructorId = req.user.id;

  try {
    const courseId = parseInt(id);

    const course = await prisma.course.findFirst({
      where: { id: courseId, instructorId },
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or you are not authorized' });
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { courseId } }),
      prisma.enrollment.deleteMany({ where: { courseId } }),
      prisma.course.delete({ where: { id: courseId } }),
    ]);

    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete Course Error:', error);
    res.status(500).json({ message: 'Failed to delete course' });
  }
};

// Helper function to validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}


