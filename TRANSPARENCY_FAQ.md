## Build your own copilot Solution Accelerator: Responsible AI FAQ
- ### What is Build your own copilot Solution Accelerator?

  This solution accelerator is an open-source GitHub Repository to help create copilots using Azure Open AI Service, Azure AI Search, and Microsoft Fabric. This can be used by anyone looking for reusable architecture and code snippets to build copilots with their own enterprise data. The repository showcases sample scenarios for research assistant and client advisor custom copilots.

- ### What can Build your own copilot Solution Accelerator do? 
  The sample solution for research assistant focuses on a researcher who wants to explore relevant articles and grants to accelerate submission of a grant proposal. The sample data is sourced from a select set of research and grants published on PubMed and NIH. The documents are intended for use as sample data only. The sample solution takes user input in text format and returns LLM responses in text format up to 800 tokens.
  It uses prompt flow to search data from AI search vector store, summarize the retrieved documents with Azure Open AI.

  The sample solution for client advisor focuses on an advisor to save time and prepare relevant discussion topics for scheduled meetings. It provides an overview of daily client meetings with seamless navigation between viewing client profiles and chatting with data. The sample data is synthetic and is generated using ficticious names. This data intended for use as sample data only. The sample solution takes user input in text format and returns LLM responses in text format up to 800 tokens.
  It uses semantic kernel to search data from AI search vector store and Azure SQL Database, summarize the results using Azure Open AI.
  
- ### What is/are Build your own copilot Solution Accelerator’s intended use(s)?  

  This repository is to be used only as a solution accelerator following the open-source license terms listed in the GitHub repository. The example scenario’s intended purpose is to help researchers do their work more efficiently.
- ### How was Build your own copilot Solution Accelerator evaluated? What metrics are used to measure performance?
  
  We have used AI Studio Prompt flow evaluation SDK to test for harmful content, groundedness, and potential security risks. 
  
- ### What are the limitations of Build your own copilot Solution Accelerator? How can users minimize the impact of Build your own copilot Solution Accelerator’s limitations when using the system?
  
  This solution accelerator can only be used as a sample to accelerate the creation of copilots. The repository showcases sample scenarios of research assistant and client advisor.  Users should review the system prompts provided and update as per their organizational guidance. Users should run their own evaluation flow either using the guidance provided in the GitHub repository or their choice of evaluation methods. AI generated content may be inaccurate and should be manually reviewed. Right now, the sample repo is available in English only.  
- ### What operational factors and settings allow for effective and responsible use of Build your own copilot Solution Accelerator?
  
  Users can try different values for some parameters like system prompt, temperature, max tokens etc. shared as configurable environment variables while running run evaluations for copilots. Please note that these parameters are only provided as guidance to start the configuration but not as a complete available list to adjust the system behavior. Please always refer to the latest product documentation for these details or reach out to your Microsoft account team if you need assistance.
