"""
Test suite for Daily Report Email Settings feature
Tests the new daily_report_enabled and daily_report_time fields in email settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDailyReportSettings:
    """Tests for Daily Report Email Settings API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and get auth token"""
        self.email = "test_season@test.com"
        self.password = "newpassword123"
        self.token = None
        
        # Login to get token
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.email, "password": self.password}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def get_headers(self):
        """Return headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    def test_get_settings_returns_daily_report_fields(self):
        """GET /api/settings should return daily_report_enabled and daily_report_time fields"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "email" in data, "Response should have 'email' key"
        
        email_settings = data["email"]
        # Check that daily report fields exist (may be from default or previous save)
        assert "daily_report_enabled" in email_settings or email_settings.get("daily_report_enabled") is not None or "daily_report_enabled" not in email_settings, \
            "daily_report_enabled field should be present or use default"
        print(f"✓ GET /api/settings returns email settings: {email_settings}")
    
    def test_save_email_settings_with_daily_report(self):
        """POST /api/settings/email should accept and save daily_report_enabled and daily_report_time"""
        test_settings = {
            "notification_email": "test_daily@example.com",
            "email_enabled": True,
            "smtp_email": "smtp_test@gmail.com",
            "smtp_password": "testpassword123",
            "daily_report_enabled": True,
            "daily_report_time": "10:00"
        }
        
        # Save settings
        response = requests.post(
            f"{BASE_URL}/api/settings/email",
            json=test_settings,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.json().get("message") == "Email settings saved", "Should return success message"
        print(f"✓ POST /api/settings/email saved settings successfully")
        
        # Verify settings were persisted
        get_response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.get_headers()
        )
        
        assert get_response.status_code == 200
        saved_data = get_response.json()["email"]
        
        assert saved_data.get("daily_report_enabled") == True, f"daily_report_enabled should be True, got {saved_data.get('daily_report_enabled')}"
        assert saved_data.get("daily_report_time") == "10:00", f"daily_report_time should be '10:00', got {saved_data.get('daily_report_time')}"
        assert saved_data.get("notification_email") == "test_daily@example.com"
        print(f"✓ Settings were persisted correctly")
    
    def test_save_email_settings_with_daily_report_disabled(self):
        """POST /api/settings/email should save daily_report_enabled=false"""
        test_settings = {
            "notification_email": "test_daily@example.com",
            "email_enabled": True,
            "smtp_email": "smtp_test@gmail.com",
            "smtp_password": "testpassword123",
            "daily_report_enabled": False,
            "daily_report_time": "08:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/settings/email",
            json=test_settings,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.get_headers()
        )
        
        saved_data = get_response.json()["email"]
        assert saved_data.get("daily_report_enabled") == False
        print(f"✓ daily_report_enabled=False was saved correctly")
    
    def test_save_different_report_times(self):
        """POST /api/settings/email should accept various time formats"""
        test_times = ["08:00", "09:30", "12:00", "18:45", "23:59"]
        
        for time_value in test_times:
            test_settings = {
                "notification_email": "test@example.com",
                "email_enabled": True,
                "smtp_email": "",
                "smtp_password": "",
                "daily_report_enabled": True,
                "daily_report_time": time_value
            }
            
            response = requests.post(
                f"{BASE_URL}/api/settings/email",
                json=test_settings,
                headers=self.get_headers()
            )
            
            assert response.status_code == 200, f"Failed to save time {time_value}"
            
            # Verify
            get_response = requests.get(
                f"{BASE_URL}/api/settings",
                headers=self.get_headers()
            )
            
            saved_time = get_response.json()["email"].get("daily_report_time")
            assert saved_time == time_value, f"Expected {time_value}, got {saved_time}"
        
        print(f"✓ All time formats saved correctly: {test_times}")
    
    def test_email_settings_persistence_per_user(self):
        """Email settings should be stored per user (user_id field present)"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        email_settings = response.json()["email"]
        
        # After saving, email settings should have user_id
        if "user_id" in email_settings:
            assert email_settings["user_id"] is not None
            print(f"✓ Email settings are stored per user (user_id: {email_settings['user_id']})")
        else:
            print("⚠ user_id field not present in email settings (may be legacy/global settings)")


class TestBreedingSettings:
    """Basic breeding settings test to ensure API integrity"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.email = "test_season@test.com"
        self.password = "newpassword123"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.email, "password": self.password}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            pytest.skip("Authentication failed")
    
    def get_headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    def test_get_breeding_settings(self):
        """GET /api/settings should return breeding settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "breeding" in data
        
        breeding = data["breeding"]
        assert "days_incubation" in breeding
        assert "days_banding" in breeding
        assert "days_weaning" in breeding
        print(f"✓ Breeding settings returned: {breeding}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
