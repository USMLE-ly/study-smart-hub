import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "suggest_tasks":
        systemPrompt = `You are an AI study assistant for medical students. Based on the user's current study progress and schedule, suggest 3-5 specific, actionable study tasks they should focus on. Each task should include a title, estimated duration in minutes, and task type (practice, flashcard, review, or focus).

Format your response as a JSON array with objects containing: title, duration_minutes, task_type, and reasoning.`;
        userPrompt = `Here's my current study situation:
- Completed tasks: ${context.completedTasks || 0}
- Pending tasks: ${context.pendingTasks || 0}
- Current streak: ${context.currentStreak || 0} days
- Subjects I'm studying: ${context.subjects?.join(", ") || "General medicine"}
- Time available today: ${context.availableMinutes || 120} minutes

Suggest personalized study tasks for me.`;
        break;

      case "analyze_performance":
        systemPrompt = `You are an AI study coach analyzing a medical student's study performance. Provide insightful, encouraging feedback about their study patterns and suggest improvements. Be specific and actionable.`;
        userPrompt = `Analyze my study performance:
- Tasks completed this week: ${context.weeklyTasks || 0}
- Average daily study time: ${context.avgDailyMinutes || 0} minutes
- Completion rate: ${context.completionRate || 0}%
- Current streak: ${context.streak || 0} days
- Strongest subjects: ${context.strongSubjects?.join(", ") || "N/A"}
- Areas needing work: ${context.weakSubjects?.join(", ") || "N/A"}

Provide personalized feedback and recommendations.`;
        break;

      case "motivate":
        systemPrompt = `You are an encouraging AI study buddy for medical students. Provide a brief, personalized motivational message based on their progress. Be warm, supportive, and specific. Keep it under 100 words.`;
        userPrompt = `My current progress:
- Level: ${context.level || 1}
- XP: ${context.xp || 0}
- Current streak: ${context.streak || 0} days
- Tasks completed today: ${context.todayTasks || 0}
- Recent achievement: ${context.recentAchievement || "None yet"}

Give me a motivational boost!`;
        break;

      case "study_tip":
        systemPrompt = `You are a medical education expert. Provide one specific, evidence-based study tip for medical students. Focus on techniques like spaced repetition, active recall, or clinical correlation. Keep it practical and under 150 words.`;
        userPrompt = `I'm currently studying: ${context.currentTopic || "medical subjects"}
My study style: ${context.studyStyle || "mixed"}

Give me a targeted study tip.`;
        break;

      default:
        systemPrompt = `You are a helpful AI study assistant for medical students.`;
        userPrompt = context.message || "Hello!";
    }

    console.log(`Processing ${type} request`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("AI response received successfully");

    return new Response(
      JSON.stringify({ content, type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Study assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
