export type UserRole = "admin" | "student";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  gradient: string;
  is_published: boolean;
  created_at: string;
}

export interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  granted_by: string | null;
  created_at: string;
}

export interface Topic {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  icon: string;
  gradient: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  sort_order: number;
  duration_minutes: number;
  is_published: boolean;
  created_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string;
  created_at: string;
}

export interface TopicWithProgress extends Topic {
  lessons: Lesson[];
  completedLessons: number;
  totalLessons: number;
}

export interface CourseWithTopics extends Course {
  topics: TopicWithProgress[];
  completedTopics: number;
  totalTopics: number;
}

export interface LessonWithProgress extends Lesson {
  topic: Topic;
  completed: boolean;
}
