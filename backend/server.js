import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const API_SECRET = process.env.API_SECRET;
const PORT = process.env.PORT;

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to check API key
const checkAuth = (req, res, next) => {
  const authHeader = req.headers["x-api-key"];
  if (!authHeader || authHeader !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

app.post("/generate", checkAuth, async (req, res) => {
  const { postText, type, language = "en", platform = "linkedin" } = req.body;

  let prompt;
  let maxTokens = 100;
  
  const languageInstruction = language === "bn" 
    ? "Write the comment in Bengali language." 
    : "Write the comment in English language.";

  const isLinkedIn = platform === "linkedin";
  const isTwitter = platform === "twitter";

  if (type === "professional") {
    if (isLinkedIn) {
      prompt = `Write ONE short professional LinkedIn comment (1-2 sentences) that demonstrates expertise and adds value to start a professional conversation. ${languageInstruction} Return ONLY the comment text, no options, no labels, no explanations:\n\n${postText}`;
    } else if (isTwitter) {
      prompt = `Write ONE short professional X (Twitter) reply (1-2 sentences) that adds insightful value and sparks meaningful engagement. ${languageInstruction} Return ONLY the comment text, no options, no labels, no explanations:\n\n${postText}`;
    }
  } else if (type === "friendly") {
    if (isLinkedIn) {
      prompt = `Write ONE short friendly LinkedIn comment (1-2 sentences) that feels warm, approachable, and encourages connection. ${languageInstruction} Return ONLY the comment text, no options, no labels, no explanations:\n\n${postText}`;
    } else if (isTwitter) {
      prompt = `Write ONE short friendly X (Twitter) reply (1-2 sentences) that feels casual, relatable, and encourages interaction. ${languageInstruction} Return ONLY the comment text, no options, no labels, no explanations:\n\n${postText}`;
    }
  } else if (type === "collaboration") {
    if (isLinkedIn) {
      prompt = `Write ONE short LinkedIn comment (1-2 sentences) expressing genuine interest in collaboration, partnership, or professional connection. Make it specific and actionable to start a meaningful conversation. ${languageInstruction} Return ONLY the comment text, no options, no labels, no explanations:\n\n${postText}`;
    } else if (isTwitter) {
      prompt = `Write ONE short X (Twitter) reply (1-2 sentences) expressing interest in collaboration, project partnership, or networking opportunity. Make it compelling and conversation-starting. ${languageInstruction} Return ONLY the comment text, no options, no labels, no explanations:\n\n${postText}`;
    }
  }

  if (!prompt) {
    return res.status(400).json({ error: "Invalid type or platform" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You write engaging ${isLinkedIn ? 'LinkedIn' : 'X (Twitter)'} comments that spark conversations and build connections. Return ONLY the comment text without any options, labels, or formatting.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    });

    let comment = completion.choices[0].message.content.trim();
    
    comment = comment.replace(/\*\*Option \d+.*?\*\*/gi, '');
    comment = comment.replace(/^>\s*/gm, '');
    comment = comment.replace(/\*\*/g, '');
    comment = comment.split('\n')[0];
    comment = comment.trim();

    res.json({ comment });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to generate comment" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
