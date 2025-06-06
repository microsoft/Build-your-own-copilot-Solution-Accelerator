from config.constants import *
import requests
import json
from dotenv import load_dotenv
import os

class BasePage:
    def __init__(self, page):
        self.page = page

    def scroll_into_view(self,locator):
        reference_list = locator
        locator.nth(reference_list.count()-1).scroll_into_view_if_needed()

    def is_visible(self,locator):
        locator.is_visible()

    def validate_response_status(self,indexName):
        load_dotenv()
        client_id = os.getenv('client_id')
        client_secret = os.getenv('client_secret')
        tenant_id = os.getenv('tenant_id')
        token_url = f"https://login.microsoft.com/{tenant_id}/oauth2/v2.0/token"
        # The URL of the API endpoint you want to access
        url = f"{URL}/conversation"
        data = {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
            'scope': f'api://{client_id}/.default'
        }
        response = requests.post(token_url, data=data)
        if response.status_code == 200:
            token_info = response.json()
            access_token = token_info['access_token']
            headers = {
                'Authorization': f'Bearer {access_token}',
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive",
                "Referer": f"{URL}/",
                "Origin": URL,
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin"
            }
            payload = {
                "index_name": indexName,
                "messages": [
                    {
                        "role": "user"
                    }
                ]
            }
            # Make the POST request
            response = self.page.request.post(url, headers=headers,data=json.dumps(payload))
            # Check the response status code
            assert response.status == 200, "response code is "+str(response.status)+" "+str(response.json())
        else:
            assert response.status_code == 200,"Failed to get token "+response.text

    def validate_draft_response_status(self,section_title,topic_text):
        load_dotenv()
        client_id = os.getenv('client_id')
        client_secret = os.getenv('client_secret')
        tenant_id = os.getenv('tenant_id')
        token_url = f"https://login.microsoft.com/{tenant_id}/oauth2/v2.0/token"
        # The URL of the API endpoint you want to access
        url = f"{URL}/draft_document/generate_section"
        data = {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
            'scope': f'api://{client_id}/.default'
        }
        response = requests.post(token_url, data=data)
        if response.status_code == 200:
            token_info = response.json()
            access_token = token_info['access_token']
            headers = {
                'Authorization': f'Bearer {access_token}',
                "Content-Type": "application/json"
            }
            payload = {
                "grantTopic":topic_text,
                "sectionContext": "",
                "sectionTitle": section_title
            }

            # Make the POST request
            response = self.page.request.post(url, headers=headers,data=json.dumps(payload))
            # Check the response status code
            assert response.status == 200, "response code is "+str(response.status)+" "+str(response.json())
        else:
            assert response.status_code == 200,"Failed to get token "+response.text
