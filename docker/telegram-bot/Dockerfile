FROM python:3.10-slim

RUN apt-get update && \
    apt-get install -y ffmpeg git && \
    apt-get clean

WORKDIR /app

COPY requirements-telegram_bot.txt /app/
RUN pip install --upgrade pip 
RUN pip install -r requirements-telegram_bot.txt

COPY . /app/

CMD ["python", "telegram_bot.py"]
