# SUMMARY:
# Docker environment to safely run tests.

FROM python:3.10

WORKDIR /app

COPY . .

RUN pip install pytest

CMD ["pytest"]