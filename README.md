# Secret LA Hacks

## Configurations

1. Require firebase-adminsdk.json in root level folder
2. In api folder setup venv
   
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt

    # Now we want to set IDE to use python interpreter venv/bin/python3
    # If using VSCode hit F1 and type python interpreter
    ```

3. In api folder setup .env

    **`.env`**
    ```
    # Can be PROD or INFO
    LEVEL=INFO

    GOOGLE_APPLICATION_CREDENTIALS={full path to firebase-adminsdk.json}
    BYPASS_AUTH=True
    ```

4. Running the app

    ```bash
    # Make sure you have sourced the venv

    fastapi run main.py
    ```