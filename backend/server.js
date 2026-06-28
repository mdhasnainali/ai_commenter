import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const API_SECRET = process.env.API_SECRET;
const PORT = process.env.PORT || 3000;

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

const SYSTEM_PROMPT = `You are a savvy professional who writes natural, conversational comments. 
Avoid all AI cliches (e.g., "delve," "unlock," "dive in," "I'm excited to"). 
Don't be overly formal or perfectly polished. Use contractions (it's, don't). 
Focus your comment on the topic, data, or news shared in the post rather than praising the author's achievement. 
Respond like a busy but thoughtful human contributing to a discussion. 
Keep comments extremely concise—aim for ONE sentence.
Never sound like a bot or a customer service agent. 
Return ONLY the comment text.`;

app.post("/generate", checkAuth, async (req, res) => {
  const { postText, type, language, platform = "linkedin", prompt: userPrompt, customInstructions, numSentences = 1 } = req.body;

  let maxTokens = 60 + (parseInt(numSentences, 10) - 1) * 40;

  const sentenceWord = parseInt(numSentences, 10) === 1 ? "ONE" : numSentences;

  let languageInstruction = `Respond in the same language as the post provided.`;
  if (language === "bn") {
    languageInstruction = `Write the comment entirely in Bengali (বাংলা) using natural, conversational phrasing. Keep it to ${sentenceWord} short sentence${numSentences > 1 ? "s" : ""}.`;
  } else if (language === "en") {
    languageInstruction = `Write the comment entirely in English. Keep it to ${sentenceWord} short sentence${numSentences > 1 ? "s" : ""}.`;
  }

  const isLinkedIn = platform === "linkedin";
  const postRef = isLinkedIn ? "LinkedIn post" : "tweet";

  let prompt;
  if (userPrompt) {
    prompt = userPrompt
      .replace(/{postRef}/g, postRef)
      .replace(/{languageInstruction}/g, languageInstruction)
      .replace(/{postText}/g, postText);
  } else {
    return res.status(400).json({ error: "No prompt provided" });
  }

  if (customInstructions) {
    prompt += `\n\nAdditional instructions from the user:\n${customInstructions}`;
  }

  let systemContent = SYSTEM_PROMPT;
  if (numSentences > 1) {
    systemContent = systemContent.replace("ONE sentence", `${numSentences} sentences`);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    });

    let comment = completion.choices[0].message.content.trim();
    
    comment = comment.replace(/\*\*Option \d+.*?\*\*/gi, '');
    comment = comment.replace(/^>\s*/gm, '');
    comment = comment.replace(/\*\*/g, '');
    if (numSentences <= 1) {
      comment = comment.split('\n')[0];
    }
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
