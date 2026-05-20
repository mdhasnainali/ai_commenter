import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate", async (req, res) => {
  const { postText, type, language = "en" } = req.body;

  let prompt;
  let maxTokens;
  
  const languageInstruction = language === "bn" 
    ? "Write the comment in Bengali language." 
    : "Write the comment in English language.";
  
  if (type === "professional") {
    prompt = `Write ONE short professional LinkedIn comment (1-2 sentences) for this post. ${languageInstruction} Return ONLY the comment text, no options, no labels, no explanations:\n\n${postText}`;
    maxTokens = 80;
  } else if (type === "friendly") {
    prompt = `Write ONE short friendly LinkedIn comment (1-2 sentences) for this post. ${languageInstruction} Return ONLY the comment text, no options, no labels, no explanations:\n\n${postText}`;
    maxTokens = 80;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that writes single, concise LinkedIn comments. Return ONLY the comment text without any options, labels, or formatting."
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
    res.status(500).json({ error: "Failed to generate comment" });
  }
});

app.listen(5000, () => {
  // Server running silently
});
