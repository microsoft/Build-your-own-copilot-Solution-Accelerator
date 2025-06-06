from dotenv import load_dotenv
import os

load_dotenv()
URL = os.getenv('url')
if URL.endswith('/'):
    URL = URL[:-1]

# HomePage input data
homepage_title = "Woodgrove Bank"
client_name = "Karen Berg"
# next_meeting_question = "when is the next meeting scheduled with this client?"
golden_path_question1 = "What were karen's concerns during our last meeting?"
golden_path_question2 = "Did karen express any concerns over market fluctuation in prior meetings?"
golden_path_question3 = "What type of asset does karen own ?"
golden_path_question4 = "Show latest asset value by asset type?"
golden_path_question5 = "How did equities asset value change in the last six months?"
# golden_path_question6 = "Give summary of previous meetings?"
golden_path_question7 = "Summarize Arun sharma previous meetings?"
invalid_response = "No data found for that client."
# invalid_response = "I cannot answer this question from the data available. Please rephrase or add more details."
