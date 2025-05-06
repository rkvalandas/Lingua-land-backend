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

class Conversation {
  private readonly chatModel: ChatGroq;
  private readonly systemPrompt: ChatPromptTemplate;
  private memory: MemorySaver;
  private app: any;
  private static instance: Conversation;

  static getInstance(): Conversation {
    if (!Conversation.instance) {
      Conversation.instance = new Conversation();
    }
    return Conversation.instance;
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

    // Create system message that defines the LLM's behavior
    this.systemPrompt = ChatPromptTemplate.fromMessages([
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
    // Define the State
    const GraphAnnotation = Annotation.Root({
      ...MessagesAnnotation.spec,
      language: Annotation<string>(),
    });
    // Define the function that calls the model
    const callModel = async (state: typeof GraphAnnotation.State) => {
      const prompt = await this.systemPrompt.invoke(state);
      const response = await this.chatModel.invoke(prompt);
      return { messages: [response] };
    };

    // Define a new graph
    const workflow = new StateGraph(GraphAnnotation)
      .addNode("model", callModel)
      .addEdge(START, "model")
      .addEdge("model", END);
    
    this.app = workflow.compile({ checkpointer: this.memory });
  }
  public async processUserInput(
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
    
    const output = await this.app.invoke(input, config);
    const responseContent = output.messages[output.messages.length - 1].content;

    // Convert MessageContent to string
    const response =
      typeof responseContent === "string"
        ? responseContent
        : Array.isArray(responseContent)
        ? responseContent
            .map((item) => (item.type === "text" ? item.text : ""))
            .join("")
        : "";

    return response;
  }
}

// Create a function that uses the singleton Conversation instance
const processWithLangChain = async (
  conversationId: number | string,
  text: string,
  language: string
): Promise<string> => {
  // Get the singleton instance
  const conversation = Conversation.getInstance();
  
  // Convert conversationId to string if it's a number
  const conversationIdStr = conversationId.toString();
  
  // Process the input and return the response
  return await conversation.processUserInput(conversationIdStr, language, text);
};

// Export the function as default
export default processWithLangChain;