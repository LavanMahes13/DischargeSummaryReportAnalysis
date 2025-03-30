import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { AzureOpenAI } from 'openai';

function App() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [fileName, setFileName] = useState("");
  
  const client = new AzureOpenAI({
    endpoint: "https://dev-tuhi-clinicalnotesynthesis.openai.azure.com",
    apiVersion: "2024-05-01-preview",
    apiKey: "149096a4341942e186e76793d516c568", // Replace with your actual API key
    dangerouslyAllowBrowser: true // Added this option to fix the browser error   
  });

  const handleProcess = async () => {
    setResult('Processing...');
    try {
      // Step 1: Create a thread
      const assistantThread = await client.beta.threads.create({});
      const threadId = assistantThread.id;  

      // Step 2: Add a user message to the thread
      const threadResponse = await client.beta.threads.messages.create(
        threadId,
        {
          role: "user",
          content: input,
        }
      );

      // Step 3: Run the assistant
      const assistantId = "asst_DeyRWVjRQjW4dyU5Zhicf8Vl"; // Your predefined Assistant ID

      const runResponse = await client.beta.threads.runs.create(threadId, {
          assistant_id: assistantId,
      });

      let runStatus = runResponse.status;
      let runId = runResponse.id;

      // Step 4: Poll until completion
      while (runStatus === 'queued' || runStatus === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 8000));
        const runStatusResponse = await client.beta.threads.runs.retrieve(
          threadId, // Fixed: Using threadId instead of assistantId
          runId
        );
        runStatus = runStatusResponse.status;
      }

      // Step 5: Get the assistant's response
      if (runStatus === 'completed') {
        const messages = await client.beta.threads.messages.list(threadId);
        const lastMessage = messages.data.filter(msg => msg.role === "assistant"&& msg.content && msg.content.length > 0).map(msg => msg.content[0].text.value);
        if (lastMessage) {
          setResult(lastMessage);
        } else {
          setResult("No response content available");
        }
      } else {
        setResult(`Run ended with status: ${runStatus}`);
      }
    } catch (error) {
      console.error("Error during process:", error);
      setResult(`Error: ${error.message}`);
    }
  };

  const handleReset = () => {
    setInput('');
    setResult('');
    setFileName('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => setInput((prevInput) => prevInput + "\n"+ e.target.result);
      reader.readAsText(file);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">
          Analyse Discharge Summary Report for SNOMED_CT_CODES
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">Input</h2>
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste text here"
                className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="absolute bottom-4 left-4">
                <input 
                  type="file"
                  accept=".txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
                  <Paperclip className="w-5 h-5 mr-2" />
                  <span>{fileName || "Attach a file"}</span>
                </label>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleProcess}
                className="px-6 py-2 bg-[#1B4D5C] text-white rounded hover:bg-[#153e4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1B4D5C]"
              >
                Process
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-medium text-gray-900">Result</h2>
            <div className="bg-white p-4 border border-gray-300 rounded-lg h-96 overflow-auto">
              {result ? (
                <div className="prose max-w-none">
                  {result}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Results will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;