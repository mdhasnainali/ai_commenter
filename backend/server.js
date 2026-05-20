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
  const { postText, type, language, platform = "linkedin" } = req.body;

  let prompt;
  let maxTokens = 60;

  let languageInstruction = "Respond in the same language as the post provided.";
  if (language === "bn") {
    languageInstruction = "Write the comment entirely in Bengali (বাংলা) using natural, conversational phrasing. Keep it to ONE short sentence.";
  } else if (language === "en") {
    languageInstruction = "Write the comment entirely in English. Keep it to ONE short sentence.";
  }

  const isLinkedIn = platform === "linkedin";

  if (type === "professional") {
    prompt = `Read this ${isLinkedIn ? 'LinkedIn post' : 'tweet'} and write ONE very concise professional comment (MAX 15-20 words). 
    Focus on the core insight or news. 
    Contribute one brief perspective. No fluff. 
    ${languageInstruction} 
    Return ONLY the comment text:\n\n${postText}`;
  } else if (type === "friendly") {
    prompt = `Read this ${isLinkedIn ? 'LinkedIn post' : 'tweet'} and write ONE short, human comment (MAX 15 words). 
    Respond to the story with a quick, supportive observation. 
    Keep it very punchy. 
    ${languageInstruction} 
    Return ONLY the comment text:\n\n${postText}`;
  } else if (type === "collaboration") {
    prompt = `Read this ${isLinkedIn ? 'LinkedIn post' : 'tweet'} and write ONE concise professional comment (MAX 20 words). 
    Acknowledge a point and suggest a chat. 
    Keep it brief and authentic. 
    ${languageInstruction} 
    Return ONLY the comment text:\n\n${postText}`;
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
          content: `You are a savvy professional who writes natural, conversational comments. 
          Avoid all AI cliches (e.g., "delve," "unlock," "dive in," "I'm excited to"). 
          Don't be overly formal or perfectly polished. Use contractions (it's, don't). 
          Focus your comment on the topic, data, or news shared in the post rather than praising the author's achievement. 
          Respond like a busy but thoughtful human contributing to a discussion. 
          Keep comments extremely concise—aim for ONE sentence.
          Never sound like a bot or a customer service agent. 
          Return ONLY the comment text.`
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
