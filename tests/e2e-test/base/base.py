from config.constants import *
import requests
import json
from dotenv import load_dotenv
import os
import re
from datetime import datetime
import uuid


class BasePage:
    def __init__(self, page):
        self.page = page

    def scroll_into_view(self,locator,text):
        elements = locator.all()
        for element in elements:
            client_e = element.text_content()
            if client_e == text:
                element.scroll_into_view_if_needed()
                break

    def select_an_element(self,locator,text):
        elements = locator.all()
        for element in elements:
            clientele = element.text_content()
            if clientele == text:
                element.click()
                break

    def is_visible(self,locator):
        locator.is_visible()

    def validate_response_status(self):
        load_dotenv()
        # client_id = os.getenv('client_id')
        # client_secret = os.getenv('client_secret')
        # tenant_id = os.getenv('tenant_id')
        # token_url = f"https://login.microsoft.com/{tenant_id}/oauth2/v2.0/token"
        # The URL of the API endpoint you want to access
        url = f"{URL}/history/update"

        # Generate unique IDs for the messages
        user_message_id = str(uuid.uuid4())
        assistant_message_id = str(uuid.uuid4())
        conversation_id = str(uuid.uuid4())

        headers = {
                "Content-Type": "application/json",
                "Accept": "*/*"
            }
        payload = {
            "conversation_id": conversation_id,
            "messages": [
                {
                    "id": user_message_id,
                    "role": "user",
                    "content":""
                },
                {
                    "id": assistant_message_id,
                    "role": "assistant",
                    "content":""
                }
            ]
        }
        # Make the POST request
        response = self.page.request.post(url, headers=headers,data=json.dumps(payload))
        # Check the response status code
        assert response.status == 200, "response code is "+str(response.status)+" "+str(response.json())

        # data = {
        #     'grant_type': 'client_credentials',
        #     'client_id': client_id,
        #     'client_secret': client_secret,
        #     'scope': f'api://{client_id}/.default'
        # }
        # response = requests.post(token_url, data=data)
        # if response.status_code == 200:
        #     token_info = response.json()
        #     access_token = token_info['access_token']
        #     # Set the headers, including the access token
        #     headers = {
        #         "Content-Type": "application/json",
        #         "Authorization": f"Bearer {access_token}",
        #         "Accept": "*/*"
        #     }
        #     payload = {
        #         "conversation_id": conversation_id,
        #         "messages": [
        #             {
        #                 "id": user_message_id,
        #                 "role": "user",
        #                 "content":""
        #             },
        #             {
        #                 "id": assistant_message_id,
        #                 "role": "assistant",
        #                 "content":""
        #             }
        #         ]
        #     }
        #     # Make the POST request
        #     response = self.page.request.post(url, headers=headers,data=json.dumps(payload))
        #     # Check the response status code
        #     assert response.status == 200, "response code is "+str(response.status)+" "+str(response.json())
        # else:
        #     assert response.status_code == 200,"Failed to get token "+response.text

    def compare_raw_date_time(self,response_text,sidepanel_text):
        # Extract date and time from response_text using regex
        match = re.search(r"((\d{4}-\d{2}-\d{2}) from (\d{2}:\d{2}:\d{2}))|((\w+ \d{1,2}, \d{4}),? from (\d{2}:\d{2}))",response_text)
        if match:
            # check for YYYY-MM-DD format in response_text
            if match.group(2) and match.group(3):
                date1_str = match.group(2)
                time1_str = match.group(3)
                date_time1 = datetime.strptime(f"{date1_str} {time1_str}","%Y-%m-%d %H:%M:%S")

            # check for 'Month DD, YYYY' format in response_text
            elif match.group(5) and match.group(6):
                date1_str = match.group(5)
                time1_str = match.group(6)
                date_time1 = datetime.strptime(f"{date1_str} {time1_str}", "%B %d, %Y %H:%M")

        else:
            raise ValueError("Date and time format not found in response_text: " + response_text)
        # remove special chars in raw sidepanel_text
        sidepanel_text_cleaned = re.sub(r"[\ue000-\uf8ff]", "",sidepanel_text)

        # Extract date and time from sidepanel_text using regex
        match2 = re.search(r"(\w+ \w+ \d{1,2}, \d{4})\s*(\d{2}:\d{2})",sidepanel_text_cleaned)
        if match2:
            date2_str = match2.group(1)
            time2_str = match2.group(2)
            date_time2 = datetime.strptime(f"{date2_str} {time2_str}", "%A %B %d, %Y %H:%M")
        else:
            raise ValueError("Date and time format not found in sidepanel_text: "+sidepanel_text)
        # Compare the two datetime objects
        assert date_time1 == date_time2
