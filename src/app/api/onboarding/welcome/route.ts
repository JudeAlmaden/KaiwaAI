import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { resolvePersonaId, ensurePersonaConversation } from "@/lib/personas-server";

/**
 * POST /api/onboarding/welcome
 * 
 * Called after successful API key setup during onboarding.
 * Creates the user's conversation with Kai and sends a welcome message.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get Kai's persona ID
    const kaiId = await resolvePersonaId("kai");
    if (!kaiId) {
      return NextResponse.json(
        { error: "Kai persona not found" },
        { status: 500 }
      );
    }

    // Ensure the user has a conversation with Kai (create if needed)
    const chatId = await ensurePersonaConversation(user.id, kaiId, "Kai");

    // Check if Kai has already sent a welcome message to this user
    const existingWelcome = await prisma.message.findFirst({
      where: {
        chatId,
        senderKind: "persona",
      },
      select: { id: true },
    });

    // Only send welcome message if one doesn't exist
    if (!existingWelcome) {
      // Get the persona member for Kai
      const personaMember = await prisma.chatMember.findFirst({
        where: { chatId, kind: "persona", personaId: kaiId },
        select: { id: true },
      });

      // Send welcome message
      const welcomeMessage = await prisma.message.create({
        data: {
          chatId,
          memberId: personaMember?.id ?? null,
          senderName: "Kai",
          senderKind: "persona",
          content: `こんにちは！ (Konnichiwa!) I'm Kai, your Japanese learning companion! 🎌

I'm so excited to help you on your Japanese learning journey! We can practice conversations, learn new vocabulary, review kanji, and most importantly — have fun while learning!

Feel free to:
✨ Chat with me in Japanese or English (or both!)
📚 Ask me to explain grammar points
🎯 Practice what you're learning
💭 Tell me about your day
🎮 Try out vocab and kanji exercises

Ready to get started? Try saying "教えて" (oshiete - teach me) and let's learn something new together! 😊`,
        },
      });

      return NextResponse.json({
        success: true,
        chatId,
        messageId: welcomeMessage.id,
      });
    }

    return NextResponse.json({
      success: true,
      chatId,
      existing: true,
    });
  } catch (error) {
    console.error("Welcome message error:", error);
    return NextResponse.json(
      { error: "Failed to send welcome message" },
      { status: 500 }
    );
  }
}
