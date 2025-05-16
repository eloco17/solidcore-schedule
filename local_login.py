from solidcore_schedule_scraper import login_and_save_cookies
import os

def main():
    print("Starting manual login process...")
    print("A Chrome window will open. Please complete the login and 2FA process.")
    print("After logging in, the cookies will be saved for Cloud Run to use.")
    
    try:
        login_and_save_cookies()
        print("\nLogin successful! Cookies have been saved.")
        print("You can now use the Cloud Run service with these saved cookies.")
    except Exception as e:
        print(f"Error during login: {str(e)}")

if __name__ == "__main__":
    main() 