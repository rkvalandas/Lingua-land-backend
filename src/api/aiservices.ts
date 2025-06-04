import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  START,
  END,
  StateGraph,
  MemorySaver,
  MessagesAnnotation,
  Annotation,
} from "@langchain/langgraph";

export type AIServiceType =
  | "conversation"
  | "grammar"
  | "translator"
  | "summariser"
  | "paraphraser";

class AIServices {
  private readonly chatModel: ChatGroq;
  private readonly conversationPrompt: ChatPromptTemplate;
  private readonly grammarPrompt: ChatPromptTemplate;
  private readonly translatorPrompt: ChatPromptTemplate;
  private readonly summariserPrompt: ChatPromptTemplate;
  private readonly paraphraserPrompt: ChatPromptTemplate;
  private memory: MemorySaver;
  private conversationApp: any;
  private static instance: AIServices;

  static getInstance(): AIServices {
    if (!AIServices.instance) {
      AIServices.instance = new AIServices();
    }
    return AIServices.instance;
  }

  private constructor() {
    this.memory = new MemorySaver();

    // Initialize the language model
    this.chatModel = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Create conversation system prompt
    this.conversationPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an expert language tutor specializing in {language} with years of experience teaching learners at all levels. Your goal is to help the user improve their language skills through complete immersion and authentic conversation.

PROFICIENCY ASSESSMENT:
- Beginner: Use simple sentences, basic vocabulary, clear examples, and repetition
- Intermediate: Introduce idioms, varied sentence structures, and cultural references
- Advanced: Challenge with nuanced expressions, colloquialisms, and sophisticated vocabulary

APPROACH:
- Respond EXCLUSIVELY in {language} - never use English or any other language
- Adapt complexity to match the user's proficiency level
- Model natural speech patterns that a native speaker would use in casual conversation
- When correcting errors, demonstrate the correct form naturally within your response
- Use synonyms, rephrasing, or simple examples to clarify meaning

RESPONSE STRUCTURE:
Begin with a natural conversational response in {language} (60-90 words) that addresses the user's message. If needed, include subtle corrections by repeating the user's intended meaning correctly. End with a thoughtful follow-up question to maintain conversation flow and encourage further practice.

CONVERSATION STRATEGIES:
- For hesitant users: Ask simple either/or questions to reduce anxiety
- For fluent users: Ask open-ended questions that invite elaboration
- If the user seems confused: Simplify vocabulary and use more repetition
- If conversation stalls: Introduce a new related topic using familiar vocabulary

Keep your tone warm, patient, and encouraging while maintaining complete immersion in {language}. Remember to NEVER use any language other than {language} in your responses.`,
      ],
      ["placeholder", "{messages}"],
    ]);

    // Create grammar checker prompt
    this.grammarPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an expert grammar checker for {language}. Your task is to:

1. Identify and correct grammatical errors in the provided text
2. Explain the corrections in a clear, educational manner
3. Provide the corrected version of the text
4. Use {language} for explanations when the target language is not English

RESPONSE FORMAT:
**Corrected Text:**
[Provide the grammatically correct version]

**Corrections Made:**
[List each correction with explanation]

**Grammar Tips:**
[Provide relevant grammar rules or tips]

Be thorough but concise. Focus on accuracy and educational value.`,
      ],
      ["human", "Please check the grammar of this {language} text: {text}"],
    ]);

    // Create translator prompt
    this.translatorPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a professional translator specializing in {source_language} to {target_language} translation. Your task is to:

1. Provide accurate, natural translations that preserve meaning and context
2. Maintain the tone and style of the original text
3. Consider cultural nuances and idiomatic expressions
4. Provide alternative translations when multiple interpretations are possible

RESPONSE FORMAT:
**Translation:**
[Provide the main translation]

**Alternative Translations:**
[If applicable, provide alternative translations with context]

**Notes:**
[Any cultural context or explanation if needed]

Ensure translations sound natural to native speakers of {target_language}.`,
      ],
      [
        "human",
        "Translate this {source_language} text to {target_language}: {text}",
      ],
    ]);

    // Create summariser prompt
    this.summariserPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an expert text summarizer. Your task is to create concise, accurate summaries that capture the key points and main ideas of the provided text.

GUIDELINES:
1. Identify and extract the most important information
2. Maintain the original meaning and context
3. Use clear, concise language
4. Organize information logically
5. Provide summaries in {language}

RESPONSE FORMAT:
**Summary:**
[Provide a comprehensive summary]

**Key Points:**
[List main points in bullet format]

**Word Count:** Original: [X] words | Summary: [Y] words

Adapt summary length based on the original text length while maintaining all essential information.`,
      ],
      ["human", "Please summarize this text in {language}: {text}"],
    ]);

    // Create paraphraser prompt
    this.paraphraserPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an expert paraphrasing assistant. Your task is to rewrite text while preserving the original meaning, using different words and sentence structures.

OBJECTIVES:
1. Maintain the original meaning and intent
2. Use varied vocabulary and sentence structures
3. Ensure the paraphrased text sounds natural
4. Preserve the tone and style when possible
5. Provide the paraphrased text in {language}

RESPONSE FORMAT:
**Paraphrased Text:**
[Provide the rewritten version]

**Alternative Versions:**
[Provide 1-2 additional paraphrasing options]

**Changes Made:**
[Brief explanation of key changes in structure/vocabulary]

Focus on creating natural, fluent text that conveys the same message with fresh expression.`,
      ],
      ["human", "Please paraphrase this {language} text: {text}"],
    ]);

    // Initialize conversation workflow
    this.initializeConversationWorkflow();
  }
  private initializeConversationWorkflow() {
    // Define the State
    const GraphAnnotation = Annotation.Root({
      ...MessagesAnnotation.spec,
      language: Annotation<string>(),
    });

    // Define the function that calls the model
    const callModel = async (state: typeof GraphAnnotation.State) => {
      const prompt = await this.conversationPrompt.invoke(state);
      const response = await this.chatModel.invoke(prompt);
      return { messages: [response] };
    };

    // Define a new graph
    const workflow = new StateGraph(GraphAnnotation)
      .addNode("model", callModel)
      .addEdge(START, "model")
      .addEdge("model", END);

    this.conversationApp = workflow.compile({ checkpointer: this.memory });
  }

  public async processConversation(
    conversation_id: string,
    language: string,
    text: string
  ): Promise<string> {
    const config = { configurable: { thread_id: conversation_id } };
    const input = {
      messages: [
        {
          role: "user",
          content: text,
        },
      ],
      language: language,
    };

    const output = await this.conversationApp.invoke(input, config);
    const responseContent = output.messages[output.messages.length - 1].content;

    return this.extractTextContent(responseContent);
  }

  public async checkGrammar(text: string, language: string): Promise<string> {
    const prompt = await this.grammarPrompt.invoke({ text, language });
    const response = await this.chatModel.invoke(prompt);
    return this.extractTextContent(response.content);
  }

  public async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    const prompt = await this.translatorPrompt.invoke({
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage,
    });
    const response = await this.chatModel.invoke(prompt);
    return this.extractTextContent(response.content);
  }

  public async summariseText(text: string, language: string): Promise<string> {
    const prompt = await this.summariserPrompt.invoke({ text, language });
    const response = await this.chatModel.invoke(prompt);
    return this.extractTextContent(response.content);
  }

  public async paraphraseText(text: string, language: string): Promise<string> {
    const prompt = await this.paraphraserPrompt.invoke({ text, language });
    const response = await this.chatModel.invoke(prompt);
    return this.extractTextContent(response.content);
  }

  private extractTextContent(responseContent: any): string {
    // Convert MessageContent to string
    return typeof responseContent === "string"
      ? responseContent
      : Array.isArray(responseContent)
      ? responseContent
          .map((item) => (item.type === "text" ? item.text : ""))
          .join("")
      : "";
  }
}

// Create functions that use the singleton AIServices instance
const processWithLangChain = async (
  conversationId: number | string,
  text: string,
  language: string
): Promise<string> => {
  const aiServices = AIServices.getInstance();
  const conversationIdStr = conversationId.toString();
  return await aiServices.processConversation(
    conversationIdStr,
    language,
    text
  );
};

export const checkGrammar = async (
  text: string,
  language: string = "English"
): Promise<string> => {
  const aiServices = AIServices.getInstance();
  return await aiServices.checkGrammar(text, language);
};

export const translateText = async (
  text: string,
  sourceLanguage: string = "English",
  targetLanguage: string = "Spanish"
): Promise<string> => {
  const aiServices = AIServices.getInstance();
  return await aiServices.translateText(text, sourceLanguage, targetLanguage);
};

export const summariseText = async (
  text: string,
  language: string = "English"
): Promise<string> => {
  const aiServices = AIServices.getInstance();
  return await aiServices.summariseText(text, language);
};

export const paraphraseText = async (
  text: string,
  language: string = "English"
): Promise<string> => {
  const aiServices = AIServices.getInstance();
  return await aiServices.paraphraseText(text, language);
};

// Export the conversation function as default for backward compatibility
export default processWithLangChain;
