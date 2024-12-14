import TextCompletion, { ChatCompletionRequest, ChatCompletionResponse } from "./completion";

const comp = new TextCompletion();

const params: ChatCompletionRequest = {
    model: "gpt-4o",
    messages: [
        { role: "user", content: "How are you?" },
        { role: "system", content: "You are a helpful assistant." },
    ]
};

(async () => {
    try {
        const resp: ChatCompletionResponse = await comp.complete(params);
        
        // Check if choices array is not empty
        if (resp.choices && resp.choices.length > 0) {
            console.log(resp.choices[0].message.content);
        } else {
            console.log("No choices returned.");
        }
    } catch (error) {
        console.error("Error during completion:", error);
    }
})();