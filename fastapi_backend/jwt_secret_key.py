import secrets

def generate_jwt_secret() -> str:
    return secrets.token_hex(32)

if __name__ == "__main__":
    jwt_secret = generate_jwt_secret()
    print(f"Generated JWT_SECRET_KEY:\n{jwt_secret} \n copy paste above jwt_secret in .env JWT_SECRET_KEY")
