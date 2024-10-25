CONTACT MANAGEMENT

1. User Registration
    Endpoint: POST /register
    Purpose: Register a new user.
    Request:
    Method: POST
    URL: http://localhost:3008/register
    Body (raw JSON):
        {
            "email": "test@example.com",
            "password": "password123"
        }
    Expected Response:
        {
            "message": "User registered successfully! Please verify your email."
        }
    
2. User Login
    Endpoint: POST /login
    Purpose: Log in a registered user to obtain a JWT token.
    Request:
        Method: POST
        URL: http://localhost:3008/login
        Body (raw JSON):
            {
                "email": "test@example.com",
                "password": "password123"
            }
        Response:
            {
                "token": "<your_token_here>"
            }
        
        Note: Copy the token from the response and save it for the next steps.
    
3. Add a Contact (Authenticated API)
        Endpoint: POST /contacts
        Purpose: Add a new contact for the logged-in user.
        Authorization: Add JWT token to the request header.

        Request:
            Method: POST
            URL: http://localhost:3008/contacts
            Headers:
                Authorization: Bearer <your_token_here> (replace <your_token_here> with the token from login)
            Body (raw JSON):
                {
                    "name": "John Doe",
                    "email": "johndoe@example.com",
                    "phone": "1234567890",
                    "address": "123 Main St",
                    "timezone": "America/New_York"
                }
            Response:
                {
                    "message": "Contact added successfully"
                }
4. Retrieve Contacts (Authenticated API)
        Endpoint: GET /contacts
        Purpose: Retrieve the list of contacts for the logged-in user, with optional query filters.
        Authorization: Add JWT token to the request header.
        Request:
            Method: GET
            URL: http://localhost:3008/contacts
            Headers:
                Authorization: Bearer <your_token_here>
            Optional Query Parameters:
                name (e.g., ?name=John)
                email (e.g., ?email=johndoe@example.com)
                timezone (e.g., ?timezone=America/New_York)
        Response:
            [
                {
                    "id": 1,
                    "name": "John Doe",
                    "email": "johndoe@example.com",
                    "phone": "1234567890",
                    "address": "123 Main St",
                    "timezone": "America/New_York",
                    "user_id": 1,
                    "created_at": "2024-10-22T12:34:56.000Z",
                    "updated_at": "2024-10-22T12:34:56.000Z",
                    "isDeleted": false
                }
            ]

5. Update a Contact (Authenticated API)
    Endpoint: PUT /contacts/:id
    Purpose: Update an existing contact.
    Authorization: Add JWT token to the request header.
    Request:
        Method: PUT
        URL: http://localhost:3008/contacts/1 (replace 1 with the contact ID)
    Headers:
        Authorization: Bearer <your_token_here>
    Body (raw JSON):
        {
            "name": "John Doe Updated",
            "email": "john.doe.updated@example.com",
            "phone": "0987654321",
            "address": "456 New Address",
            "timezone": "America/Los_Angeles"
        }
    Response
        {
            "message": "Contact updated successfully"
        }   

6. Soft Delete a Contact (Authenticated API)
        Endpoint: DELETE /contacts/:id
        Purpose: Soft-delete a contact (mark as deleted, but don't remove from DB).
        Authorization: Add JWT token to the request header.
        Request:
            Method: DELETE
            URL: http://localhost:3008/contacts/1 (replace 1 with the contact ID)
        Headers:
            Authorization: Bearer <your_token_here>
        Response:
            {
                "message": "Contact deleted successfully"
            }

7. CSV File Upload (Authenticated API)
        Endpoint: POST /contacts/upload
        Purpose: Upload a CSV file with contacts.
        Authorization: Add JWT token to the request header.
        Request:
            Method: POST
            URL: http://localhost:3008/contacts/upload
        Headers:
            Authorization: Bearer <your_token_here>
        Body (form-data):
            Add the field file and upload a CSV file.
        Response:
            {
                "message": "Contacts uploaded successfully"
            }

8. Download Contacts as Excel (Authenticated API)
        Endpoint: GET /contacts/download
        Purpose: Download all contacts for the logged-in user as an Excel file.
        Authorization: Add JWT token to the request header.
        Request:
            Method: GET
            URL: http://localhost:3008/contacts/download
        Headers:
            Authorization: Bearer <your_token_here>
        Response:
            Download: You should get an Excel file with the contact data.








