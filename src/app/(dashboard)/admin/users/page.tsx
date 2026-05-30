"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Course, UserCourse } from "@/types";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/components/shared/toast-provider";
import { Shield, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const supabase = createClient();
  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, coursesRes, userCoursesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("courses").select("*").order("created_at"),
        supabase.from("user_courses").select("*")
      ]);

      if (profilesRes.data) setUsers(profilesRes.data);
      if (coursesRes.data) setCourses(coursesRes.data);
      if (userCoursesRes.data) setUserCourses(userCoursesRes.data);
    } catch (error) {
      console.error("Error loading admin data:", error);
      addToast("Ошибка загрузки данных", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (userId: string, currentStatus: boolean) => {
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: !currentStatus })
        .eq("id", userId);

      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, is_approved: !currentStatus } : u));
      addToast(currentStatus ? "Доступ закрыт" : "Пользователь одобрен", "success");
    } catch (error) {
      console.error(error);
      addToast("Ошибка при изменении статуса", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleCourseAccess = async (userId: string, courseId: string, hasAccess: boolean) => {
    setProcessingId(`${userId}-${courseId}`);
    try {
      if (hasAccess) {
        // Revoke
        const { error } = await supabase
          .from("user_courses")
          .delete()
          .match({ user_id: userId, course_id: courseId });
        
        if (error) throw error;
        setUserCourses(userCourses.filter(uc => !(uc.user_id === userId && uc.course_id === courseId)));
      } else {
        // Grant
        const { data, error } = await supabase
          .from("user_courses")
          .insert({ user_id: userId, course_id: courseId })
          .select()
          .single();
          
        if (error) throw error;
        if (data) setUserCourses([...userCourses, data as UserCourse]);
      }
      addToast("Доступы обновлены", "success");
    } catch (error) {
      console.error(error);
      addToast("Ошибка при обновлении доступов", "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-card-hover/50">
              <th className="p-4 text-sm font-semibold text-muted">Пользователь</th>
              <th className="p-4 text-sm font-semibold text-muted">Роль</th>
              <th className="p-4 text-sm font-semibold text-muted">Статус</th>
              <th className="p-4 text-sm font-semibold text-muted text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              const isExpanded = expandedUserId === user.id;
              const isProcessing = processingId === user.id;
              
              return (
                <React.Fragment key={user.id}>
                  <tr className={`hover:bg-card-hover/50 transition-colors ${isExpanded ? 'bg-card-hover/30' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full bg-border object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-medium">
                            {getInitials(user.full_name || "US")}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground">{user.full_name || "Без имени"}</div>
                          <div className="text-xs text-muted font-mono">{user.id.slice(0,8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                          <Shield className="w-3 h-3" />
                          Админ
                        </span>
                      ) : (
                        <span className="text-sm text-muted">Студент</span>
                      )}
                    </td>
                    <td className="p-4">
                      {user.is_approved ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-success">
                          <CheckCircle2 className="w-4 h-4" />
                          Одобрен
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-warning">
                          <ShieldAlert className="w-4 h-4" />
                          Ожидает
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== "admin" && (
                          <button
                            onClick={() => toggleApproval(user.id, user.is_approved)}
                            disabled={isProcessing}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              user.is_approved 
                                ? "bg-error/10 text-error hover:bg-error/20" 
                                : "bg-success/10 text-success hover:bg-success/20"
                            }`}
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (user.is_approved ? "Заблокировать" : "Одобрить")}
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors"
                          title="Управление доступами к курсам"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="bg-card-hover/10">
                      <td colSpan={4} className="p-0">
                        <div className="p-6 border-b border-border">
                          <h4 className="text-sm font-semibold text-foreground mb-4">Доступ к курсам</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {courses.map(course => {
                              const hasAccess = userCourses.some(uc => uc.user_id === user.id && uc.course_id === course.id);
                              const isToggling = processingId === `${user.id}-${course.id}`;
                              
                              return (
                                <div key={course.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-accent/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${hasAccess ? 'bg-success glow-accent' : 'bg-muted/30'}`} />
                                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]" title={course.title}>
                                      {course.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-xs font-medium ${hasAccess ? 'text-success' : 'text-muted'}`}>
                                      {isToggling ? "Загрузка..." : (hasAccess ? "Доступ открыт" : "Доступ закрыт")}
                                    </span>
                                    <button
                                      onClick={() => toggleCourseAccess(user.id, course.id, hasAccess)}
                                      disabled={isToggling}
                                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
                                        hasAccess ? 'bg-success' : 'bg-muted/50'
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                          hasAccess ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
