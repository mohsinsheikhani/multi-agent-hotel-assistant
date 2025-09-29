import os
from strands import Agent, tool
from strands.models.litellm import LiteLLMModel
from strands.multiagent.a2a import A2AServer
from email.mime.text import MIMEText
from typing import Dict
import smtplib
from .base import BaseAgent
from ..utils.mcp_client import create_mcp_client

SUBJECT_COMPOSER_ASSISTANT_PROMPT = """
You are an expert email subject line composer for a hotel booking system.
Your goal is to write short, clear, and professional email subjects that are  personalized and immediately tell the recipient what the email is about.

Guidelines:
- Be concise.
- Always include booking_id or hotel_name when relevant.
- Match the tone to the event type:
  - Confirmation: positive, reassuring (e.g., "Booking Confirmed - Hotel Sunshine, #12345")
  - Modification: informative, neutral (e.g., "Booking Updated - New Dates for #12345")
  - Cancellation: clear, neutral (e.g., "Booking Cancelled - #12345")
- Avoid marketing language or unnecessary fluff.
- Keep capitalization professional (Title Case or Sentence Case).
- If the event type is unknown, write a neutral subject summarizing the message.

Output:
Return only the subject line as plain text, with no additional commentary.
"""

HTML_FORMATTER_ASSISTANT_PROMPT = """
You are an expert HTML email formatter for a hotel booking system.
You will receive a plain-text email body (may include simple markdown).
Your job is to convert it into a responsive, visually appealing, and good looking HTML email design.

Guidelines:
- Use semantic HTML with <html>, <body>, and <table> for layout (works in most email clients).
- Use inline CSS for styling (since email clients often strip external CSS).
- Make it mobile-friendly: single column layout, padded content.
- Include a clear header with hotel name or system name.
- Use bold for important details like booking_id, dates, status, and total price.
- Keep the design clean and professional, no unnecessary colors or flashy styling.
- Return **only the HTML body** as output (no extra commentary).
"""

NOTIFICATION_AGENT_PROMPT = """
You are the Notification Agent for a hotel booking system.
Your job is to receive structured events (BookingCreated, BookingModified, BookingCancelled)
along with full booking context, and create clear, professional notifications.

Your responsibilities:
1. Classify the event type and decide the appropriate notification template.
2. Construct a plain-text email body summarizing the booking details (booking_id, hotel name,
   check-in date, check-out date, rooms, price, status, etc.).
3. Use the "subject_composer_assistant" tool to generate a professional subject line for the email.
4. Use the "html_formatter_assistant" tool to format the email body into a clean HTML layout.
5. Use the "email_sender" tool to send the email with the generated subject and HTML body.

Guidelines:
- Always include all relevant booking details so the user understands exactly what happened.
- Keep the tone professional, clear, and user-friendly.
- For cancellations, mention the status as "CANCELLED" and if available, include any cancellation fees.
- For modifications, mention what was changed (e.g., new dates, room count, or price adjustments).
- Return a structured, actionable response confirming the notification was sent.
"""

@tool
def subject_composer_assistant(query: str) -> str:
    """
    Generate a professional email subject line based on the provided booking context.

    Args:
        query: A structured message or context (e.g., booking confirmation, modification details).

    Returns:
        A short, professional subject line for the email.
    """
    try:
        model = LiteLLMModel(
            client_args={"api_key": os.getenv("GOOGLE_API_KEY")},
            model_id="gemini/gemini-2.5-flash",
        )
        subject_agent = Agent(
            model,
            system_prompt=SUBJECT_COMPOSER_ASSISTANT_PROMPT,
        )
        response = subject_agent(query)
        return str(response).strip()
    except Exception as e:
        return f"Error in subject composer assistant: {str(e)}"

@tool
def html_formatter_assistant(query: str) -> str:
    """
    Converts a plain-text or markdown email body into a properly styled HTML email body.

    Args:
        query: The email body content as text or markdown.

    Returns:
        A responsive, well-formatted HTML string suitable for sending via email.
    """
    try:
        model = LiteLLMModel(
            client_args={"api_key": os.getenv("GOOGLE_API_KEY")},
            model_id="gemini/gemini-2.5-flash",
        )
        html_agent = Agent(
            model,
            system_prompt=HTML_FORMATTER_ASSISTANT_PROMPT,
        )
        response = html_agent(query)
        return str(response).strip()
    except Exception as e:
        return f"Error in HTML formatter assistant: {str(e)}"

@tool
def email_sender(subject: str, html_body: str) -> Dict[str, str]:
    """
    Sends an HTML email with the provided subject and body using Gmail SMTP.

    Args:
        subject (str): The subject line of the email.
        html_body (str): The HTML-formatted body of the email.

    Returns:
        dict: A structured result with:
            - "status": "success" if the email was sent, otherwise "failure".
            - "message": Optional error message when status is "failure".
    """
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD")
    from_email = os.getenv("GMAIL_USER")
    to_email = os.getenv("GMAIL_TO")
    
    msg = MIMEText(html_body, "html")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    print(msg.as_string())

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(from_email, gmail_app_password)
            server.send_message(msg)
        return {
            "status": "success",
            "message": f"Email successfully sent to {to_email}",
        }
    except Exception as e:
        return {"status": "failure", "message": f"Failed to send email: {str(e)}"}

class NotificationAgent(BaseAgent):
    """Agent responsible for handling booking notifications and communications"""
    
    def __init__(self):
        super().__init__(port="9004")
    
    def get_agent_name(self) -> str:
        return "NotificationAgent"
    
    def get_agent_description(self) -> str:
        return "Coordinates booking notifications for the system. Receives structured events (BookingCreated, BookingModified, BookingCancelled), generates a professional email subject, converts the email body to HTML, and sends the email notification to the guest using available tools."
    
    def get_system_prompt(self) -> str:
        return NOTIFICATION_AGENT_PROMPT
    
    def _create_agent(self) -> Agent:
        """Override to add custom tools along with MCP tools"""
        try:
            mcp_client = create_mcp_client()
            
            with mcp_client:
                mcp_tools = mcp_client.list_tools_sync()
                
                # Combine MCP tools with custom notification tools
                all_tools = list(mcp_tools) + [
                    subject_composer_assistant,
                    html_formatter_assistant,
                    email_sender
                ]
                
                model = LiteLLMModel(
                    client_args={"api_key": os.getenv("GOOGLE_API_KEY")},
                    model_id="gemini/gemini-2.5-flash",
                )
                
                agent = Agent(
                    model,
                    name=self.get_agent_name(),
                    description=self.get_agent_description(),
                    system_prompt=self.get_system_prompt(),
                    tools=all_tools,
                )
                
                return agent
        except Exception as e:
            print(f"Failed to create notification agent: {e}")
            raise

if __name__ == "__main__":
    agent = NotificationAgent()
    agent.serve()
