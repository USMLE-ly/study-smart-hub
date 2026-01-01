import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklySummaryRequest {
  userId?: string;
  sendToAll?: boolean;
}

interface WeeklySummaryData {
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  minutesStudied: number;
  testsCompleted: number;
  avgTestScore: number;
  currentStreak: number;
  weekLabel: string;
}

const generateEmailHtml = (data: WeeklySummaryData, userName: string): string => {
  const getCompletionEmoji = (rate: number) => {
    if (rate >= 90) return "🏆";
    if (rate >= 70) return "🌟";
    if (rate >= 50) return "💪";
    return "📚";
  };

  const getMotivationalMessage = (rate: number) => {
    if (rate >= 90) return "Outstanding week! You're crushing it!";
    if (rate >= 70) return "Great progress! Keep up the momentum!";
    if (rate >= 50) return "Good effort! Every step counts!";
    return "Every day is a fresh start. You've got this!";
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Weekly Study Report</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${data.weekLabel}</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 32px;">
          <!-- Greeting -->
          <p style="font-size: 16px; color: #374151; margin: 0 0 24px 0;">Hi ${userName},</p>
          
          <!-- Emoji & Message -->
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">${getCompletionEmoji(data.completionRate)}</span>
            <p style="color: #6B7280; margin: 8px 0 0 0;">${getMotivationalMessage(data.completionRate)}</p>
          </div>
          
          <!-- Stats Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <!-- Tasks -->
            <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 0;">${data.tasksCompleted}/${data.totalTasks}</p>
              <p style="color: #6B7280; font-size: 12px; margin: 4px 0 0 0;">Tasks Completed</p>
            </div>
            
            <!-- Study Time -->
            <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="font-size: 24px; font-weight: bold; color: #2563EB; margin: 0;">${formatTime(data.minutesStudied)}</p>
              <p style="color: #6B7280; font-size: 12px; margin: 4px 0 0 0;">Study Time</p>
            </div>
            
            <!-- Streak -->
            <div style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="font-size: 24px; font-weight: bold; color: #EA580C; margin: 0;">${data.currentStreak}</p>
              <p style="color: #6B7280; font-size: 12px; margin: 4px 0 0 0;">Day Streak</p>
            </div>
            
            <!-- Tests -->
            <div style="background-color: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 8px; padding: 16px; text-align: center;">
              <p style="font-size: 24px; font-weight: bold; color: #7C3AED; margin: 0;">${data.testsCompleted}</p>
              <p style="color: #6B7280; font-size: 12px; margin: 4px 0 0 0;">Tests Completed</p>
            </div>
          </div>
          
          <!-- Completion Rate Bar -->
          <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6B7280; font-size: 14px;">Weekly Completion</span>
              <span style="color: #374151; font-weight: 600;">${data.completionRate}%</span>
            </div>
            <div style="background-color: #E5E7EB; border-radius: 4px; height: 8px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #1D4ED8, #3B82F6); height: 100%; width: ${data.completionRate}%; border-radius: 4px;"></div>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 32px;">
            <a href="#" style="display: inline-block; background: linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">View Full Report</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            You're receiving this because you opted in to weekly study summaries.
          </p>
          <p style="color: #9CA3AF; font-size: 12px; margin: 8px 0 0 0;">
            To unsubscribe, update your notification preferences in Settings.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Weekly summary email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { userId, sendToAll }: WeeklySummaryRequest = await req.json();
    
    console.log("Request params:", { userId, sendToAll });

    // Get users who have weekly emails enabled
    let query = supabase
      .from("profiles")
      .select("user_id, email, full_name, weekly_email_enabled");
    
    if (userId) {
      query = query.eq("user_id", userId);
    } else if (sendToAll) {
      query = query.eq("weekly_email_enabled", true);
    } else {
      throw new Error("Must provide userId or sendToAll flag");
    }

    const { data: profiles, error: profilesError } = await query;
    
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users to send emails to`);

    const results: { email: string; success: boolean; error?: string }[] = [];

    // Calculate date range for the week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekLabel = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    for (const profile of profiles || []) {
      if (!profile.email) {
        console.log(`Skipping user ${profile.user_id} - no email`);
        continue;
      }

      try {
        // Fetch user's study tasks for the week
        const { data: tasks } = await supabase
          .from("study_tasks")
          .select("*")
          .eq("user_id", profile.user_id)
          .gte("scheduled_date", startOfWeek.toISOString().split('T')[0])
          .lte("scheduled_date", endOfWeek.toISOString().split('T')[0]);

        const completedTasks = tasks?.filter(t => t.is_completed) || [];
        const totalTasks = tasks?.length || 0;
        const tasksCompleted = completedTasks.length;
        const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
        const minutesStudied = completedTasks.reduce((sum, t) => sum + (t.estimated_duration_minutes || 0), 0);

        // Fetch tests for the week
        const { data: tests } = await supabase
          .from("tests")
          .select("*")
          .eq("user_id", profile.user_id)
          .eq("status", "completed")
          .gte("created_at", startOfWeek.toISOString())
          .lte("created_at", endOfWeek.toISOString());

        const testsCompleted = tests?.length || 0;
        const avgTestScore = testsCompleted > 0 
          ? Math.round(tests!.reduce((sum, t) => sum + (t.score_percentage || 0), 0) / testsCompleted)
          : 0;

        // Fetch gamification stats
        const { data: gamification } = await supabase
          .from("user_gamification")
          .select("current_streak")
          .eq("user_id", profile.user_id)
          .single();

        const summaryData: WeeklySummaryData = {
          tasksCompleted,
          totalTasks,
          completionRate,
          minutesStudied,
          testsCompleted,
          avgTestScore,
          currentStreak: gamification?.current_streak || 0,
          weekLabel,
        };

        console.log(`Sending email to ${profile.email} with data:`, summaryData);

        const emailResponse = await resend.emails.send({
          from: "StudyPlan <onboarding@resend.dev>",
          to: [profile.email],
          subject: `📊 Your Weekly Study Summary - ${weekLabel}`,
          html: generateEmailHtml(summaryData, profile.full_name || "Student"),
        });

        console.log("Email sent successfully:", emailResponse);
        results.push({ email: profile.email, success: true });
      } catch (error: any) {
        console.error(`Error sending email to ${profile.email}:`, error);
        results.push({ email: profile.email, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-summary function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
