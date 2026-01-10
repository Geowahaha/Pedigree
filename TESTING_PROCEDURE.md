# Petdegree AI Chatbot Testing Procedure

This guide outlines the steps to verify the functionality of the new Intelligent AI Chatbot in the Petdegree application.

## Prerequisites
- Ensure the application is running locally:
  ```bash
  npm run dev
  ```
- Open the application in your browser (e.g., `http://localhost:8082`).
- Log in if required (though some features might work as a guest, logging in is best for full functionality).

## 1. Accessing the Feature
1. Navigate to the marketplace or a pet listing page.
2. Click on any pet card to open the **Pet Details Modal**.
3. Locate the **"Community Talk"** section and the input field labeled **"Ask anything or comment..."**.

## 2. Test: Question vs. Comment Distinction
The input field is now "smart" and decides whether to post a social comment or open the AI assistant.

### Scenario A: Posting a Comment (Social)
**Action:**
- Type a simple statement or compliment without question words.
- Examples:
  - "This dog is so cute!"
  - "Beautiful colors."
  - "Nice picture."
- Press **Enter** or click the send button.

**Expected Result:**
- The text is posted directly to the "Community Talk" wall below.
- The AI chat overlay does **NOT** open.

### Scenario B: Asking a Question (AI Trigger)
**Action:**
- Type a question using specific keywords or a question mark.
- Examples:
  - "How much is this?"
  - "Who are the parents?"
  - "มีลูกไหม" (Thai: Do you have children?)
  - "What is the price?"
  - Ends with `?`
- Press **Enter** or click the send button.

**Expected Result:**
- The **AI Chat Overlay** opens automatically.
- The AI displays a "thinking" state (simulated delay).
- The AI provides an answer based on the real database data.

## 3. Test: AI Intelligence & Data Lookups
Once the AI Chat is open, test specific capabilities.

### A. Lineage & Parents
**Query:** "Who is the father?" or "Show me parents"
**Expected Result:**
- AI searches for `father_id` and `mother_id`.
- Returns names and registration numbers if they exist.
- Example response: "The father is [Name] (Reg: [Number])..."

### B. Registration & Documents
**Query:** "Is this pet registered?" or "Do you have papers?" or "What is the registration number?"
**Expected Result:**
- AI checks `registration_number` and the `pet_documents` table.
- Returns the registration number (if available) and lists any uploaded documents (e.g., vaccination cards).

### C. Offspring (Children)
**Query:** "Does it have children?" or "Show me puppies"
**Expected Result:**
- AI searches for other pets in the database where this pet is listed as the father or mother.
- Prioritizes showing "For Sale" or "Available" puppies.
- Returns a list of children with their names and links.

### D. General Search
**Query:** "Search for Golden Retriever" or "Find other dogs"
**Expected Result:**
- AI recognizes the "search" intent.
- Performs a database search for pets matching the name or breed.
- Returns a list of matching pets.

## 4. Test: User Experience
- **Thinking Time**: Verify that the AI pauses briefly (approx. 1 second) before responding to simulate processing.
- **Persistence**: Verify that the chat window stays open until you click the **"Close"** or **"X"** button.
- **Fallback**: Try typing gibberish or a query it doesn't understand. Verify it politely says it doesn't know and suggests valid topics (health, lineage, etc.).

## 5. Feedback
After performing these tests, please report back on:
- Accuracy of the answers (were the parents correct?).
- Feel of the "thinking" delay (too long? too short?).
- Any errors or unexpected attributes.
