FROM python:3.12-slim-buster

COPY ./api .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
CMD ["fastapi", "run", "main.py"]