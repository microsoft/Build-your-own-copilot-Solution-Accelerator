from dotenv import load_dotenv
import os

load_dotenv()
URL = os.getenv('url')
if URL.endswith('/'):
    URL = URL[:-1]

# Articles input data
articles_question1 = "What are the effects of influenza vaccine on immunocompromised populations?"
articles_question2 = "How do co-morbidities such as hypertension and obesity affect vaccine effectiveness?"
index_name_articles = "Articles"
# Grants input data
grants_question1 = "are there any grants that focus on clinical research concerning influenza vaccination?"
grants_question2 = "Do any of these grant requests mention variables such as demographics, socio-economics, or comorbidities? "
index_name_grants = "Grants"
# Draft input data
draft_topic_text = "The effects of influenza vaccine on immunocompromised persons"

