import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FlashcardDeck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  subject: string | null;
  is_system_deck: boolean | null;
  created_at: string;
  updated_at: string;
  card_count?: number;
  due_count?: number;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front_content: string;
  back_content: string;
  front_image_url: string | null;
  back_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  box_number: number;
  next_review_date: string;
  review_count: number;
  correct_count: number;
  last_reviewed_at: string | null;
}

// Leitner system intervals (in days)
const LEITNER_INTERVALS = [1, 2, 5, 8, 14];

export function useFlashcards() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("flashcard_decks")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDecks(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const createDeck = async (name: string, description?: string, subject?: string, color?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: user.id,
        name,
        description,
        subject,
        color: color || "#3b82f6",
      })
      .select()
      .single();

    if (!error && data) {
      setDecks((prev) => [data, ...prev]);
    }

    return { data, error };
  };

  const getFlashcardsForDeck = async (deckId: string) => {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    return { data, error };
  };

  const getDueFlashcards = async (deckId: string) => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const today = new Date().toISOString().split("T")[0];

    // Get all flashcards for the deck
    const { data: flashcards, error: flashcardsError } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId);

    if (flashcardsError) return { data: null, error: flashcardsError };

    // Get progress for these flashcards
    const flashcardIds = flashcards?.map((f) => f.id) || [];
    const { data: progress } = await supabase
      .from("flashcard_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("flashcard_id", flashcardIds);

    // Filter for due cards
    const progressMap = new Map(progress?.map((p) => [p.flashcard_id, p]));
    const dueCards = flashcards?.filter((card) => {
      const cardProgress = progressMap.get(card.id);
      if (!cardProgress) return true; // New card
      return cardProgress.next_review_date <= today;
    });

    return { data: dueCards, error: null, progressMap };
  };

  const recordAnswer = async (flashcardId: string, isCorrect: boolean) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Get current progress
    const { data: existing } = await supabase
      .from("flashcard_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("flashcard_id", flashcardId)
      .maybeSingle();

    const today = new Date();
    let newBoxNumber = 1;
    let nextReviewDate = new Date();

    if (existing) {
      if (isCorrect) {
        // Move up a box (max 5)
        newBoxNumber = Math.min(existing.box_number + 1, 5);
      } else {
        // Move back to box 1
        newBoxNumber = 1;
      }
    } else {
      newBoxNumber = isCorrect ? 2 : 1;
    }

    // Calculate next review date based on Leitner intervals
    const interval = LEITNER_INTERVALS[newBoxNumber - 1];
    nextReviewDate.setDate(today.getDate() + interval);

    if (existing) {
      const { error } = await supabase
        .from("flashcard_progress")
        .update({
          box_number: newBoxNumber,
          next_review_date: nextReviewDate.toISOString().split("T")[0],
          review_count: existing.review_count + 1,
          correct_count: isCorrect ? existing.correct_count + 1 : existing.correct_count,
          last_reviewed_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return { error };
    } else {
      const { error } = await supabase.from("flashcard_progress").insert({
        user_id: user.id,
        flashcard_id: flashcardId,
        box_number: newBoxNumber,
        next_review_date: nextReviewDate.toISOString().split("T")[0],
        review_count: 1,
        correct_count: isCorrect ? 1 : 0,
        last_reviewed_at: new Date().toISOString(),
      });

      return { error };
    }
  };

  const addFlashcard = async (deckId: string, frontContent: string, backContent: string) => {
    const { data, error } = await supabase
      .from("flashcards")
      .insert({
        deck_id: deckId,
        front_content: frontContent,
        back_content: backContent,
      })
      .select()
      .single();

    return { data, error };
  };

  return {
    decks,
    loading,
    fetchDecks,
    createDeck,
    getFlashcardsForDeck,
    getDueFlashcards,
    recordAnswer,
    addFlashcard,
  };
}