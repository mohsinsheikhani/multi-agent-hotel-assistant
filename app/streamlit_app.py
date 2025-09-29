import streamlit as st
import requests

st.title("Hotel Booking Assistant")

if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("Ask about hotels..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        response = requests.post("http://localhost:9000/inquire", json={"question": prompt})
        reply = response.json()[0]["text"] if response.status_code == 200 else "Error occurred"
        st.markdown(reply)
        st.session_state.messages.append({"role": "assistant", "content": reply})
