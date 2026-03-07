"""
Test cases for Canary Breeding Management Application
Focuses on:
1. Interactive egg status feature - PUT /api/clutches/{clutch_id}/eggs/{egg_id}
2. Email settings - POST /api/settings/email 
3. Test email endpoint - POST /api/settings/test-email
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_pair_with_incubating_clutch(api_client):
    """Create a test pair with an incubating clutch for egg status tests"""
    # First, get existing zones and cages
    zones_res = api_client.get(f"{BASE_URL}/api/zones")
    zones = zones_res.json()
    
    # Create zone if none exists
    if not zones:
        zone_res = api_client.post(f"{BASE_URL}/api/zones", json={
            "name": "TEST_Zone",
            "rows": 2,
            "columns": 2
        })
        zone = zone_res.json()
        # Generate cages for the zone
        api_client.post(f"{BASE_URL}/api/zones/{zone['id']}/generate-cages")
    else:
        zone = zones[0]
    
    # Get cages
    cages_res = api_client.get(f"{BASE_URL}/api/cages", params={"zone_id": zone['id']})
    cages = cages_res.json()
    
    if not cages:
        # Generate cages if none exist
        api_client.post(f"{BASE_URL}/api/zones/{zone['id']}/generate-cages")
        cages_res = api_client.get(f"{BASE_URL}/api/cages", params={"zone_id": zone['id']})
        cages = cages_res.json()
    
    cage_id = cages[0]['id'] if cages else None
    
    # Create test pair
    pair_data = {
        "name": f"TEST_Pair_{uuid.uuid4().hex[:6]}",
        "cage_id": cage_id,
        "notes": "Test pair for egg status testing"
    }
    pair_res = api_client.post(f"{BASE_URL}/api/pairs", json=pair_data)
    assert pair_res.status_code == 200, f"Failed to create test pair: {pair_res.text}"
    pair = pair_res.json()
    
    # Create a clutch for the pair
    clutch_res = api_client.post(f"{BASE_URL}/api/clutches", json={
        "pair_id": pair['id'],
        "notes": "Test clutch for egg status testing"
    })
    assert clutch_res.status_code == 200, f"Failed to create clutch: {clutch_res.text}"
    clutch = clutch_res.json()
    
    # Add eggs to the clutch
    for i in range(3):
        egg_res = api_client.post(f"{BASE_URL}/api/clutches/{clutch['id']}/eggs", json={})
        assert egg_res.status_code == 200, f"Failed to add egg: {egg_res.text}"
    
    # Start incubation to allow egg status changes
    today = "2026-01-15"
    update_res = api_client.put(f"{BASE_URL}/api/clutches/{clutch['id']}", json={
        "status": "incubating",
        "incubation_start": today
    })
    assert update_res.status_code == 200, f"Failed to start incubation: {update_res.text}"
    updated_clutch = update_res.json()
    
    yield {
        "pair": pair,
        "clutch": updated_clutch
    }
    
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/clutches/{clutch['id']}")
    api_client.delete(f"{BASE_URL}/api/pairs/{pair['id']}")


class TestEggStatusUpdate:
    """Tests for PUT /api/clutches/{clutch_id}/eggs/{egg_id} endpoint"""
    
    def test_update_egg_to_fertile(self, api_client, test_pair_with_incubating_clutch):
        """Test marking an egg as fertile"""
        clutch = test_pair_with_incubating_clutch['clutch']
        clutch_id = clutch['id']
        egg_id = clutch['eggs'][0]['id']
        
        response = api_client.put(
            f"{BASE_URL}/api/clutches/{clutch_id}/eggs/{egg_id}",
            json={"status": "fertile"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify the egg status was updated
        updated_egg = next((e for e in data['eggs'] if e['id'] == egg_id), None)
        assert updated_egg is not None
        assert updated_egg['status'] == 'fertile'
        print(f"Egg {egg_id} successfully marked as fertile")
    
    def test_update_egg_to_infertile(self, api_client, test_pair_with_incubating_clutch):
        """Test marking an egg as infertile"""
        clutch = test_pair_with_incubating_clutch['clutch']
        clutch_id = clutch['id']
        egg_id = clutch['eggs'][1]['id']
        
        response = api_client.put(
            f"{BASE_URL}/api/clutches/{clutch_id}/eggs/{egg_id}",
            json={"status": "infertile"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        updated_egg = next((e for e in data['eggs'] if e['id'] == egg_id), None)
        assert updated_egg is not None
        assert updated_egg['status'] == 'infertile'
        print(f"Egg {egg_id} successfully marked as infertile")
    
    def test_update_egg_to_hatched_with_band_number(self, api_client, test_pair_with_incubating_clutch):
        """Test marking an egg as hatched with a band number"""
        clutch = test_pair_with_incubating_clutch['clutch']
        clutch_id = clutch['id']
        egg_id = clutch['eggs'][2]['id']
        
        response = api_client.put(
            f"{BASE_URL}/api/clutches/{clutch_id}/eggs/{egg_id}",
            json={
                "status": "hatched",
                "hatched_date": "2026-01-28",
                "band_number": "TEST-2026-001",
                "banded_date": "2026-01-30"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        updated_egg = next((e for e in data['eggs'] if e['id'] == egg_id), None)
        assert updated_egg is not None
        assert updated_egg['status'] == 'hatched'
        assert updated_egg['hatched_date'] == '2026-01-28'
        assert updated_egg['band_number'] == 'TEST-2026-001'
        assert updated_egg['banded_date'] == '2026-01-30'
        print(f"Egg {egg_id} successfully hatched and banded")
    
    def test_update_nonexistent_egg_returns_404(self, api_client, test_pair_with_incubating_clutch):
        """Test that updating a non-existent egg returns 404"""
        clutch = test_pair_with_incubating_clutch['clutch']
        clutch_id = clutch['id']
        fake_egg_id = str(uuid.uuid4())
        
        response = api_client.put(
            f"{BASE_URL}/api/clutches/{clutch_id}/eggs/{fake_egg_id}",
            json={"status": "fertile"}
        )
        
        assert response.status_code == 404
        assert "Egg not found" in response.json().get('detail', '')
        print(f"Non-existent egg correctly returns 404")
    
    def test_update_egg_on_nonexistent_clutch_returns_404(self, api_client):
        """Test that updating egg on non-existent clutch returns 404"""
        fake_clutch_id = str(uuid.uuid4())
        fake_egg_id = str(uuid.uuid4())
        
        response = api_client.put(
            f"{BASE_URL}/api/clutches/{fake_clutch_id}/eggs/{fake_egg_id}",
            json={"status": "fertile"}
        )
        
        assert response.status_code == 404
        assert "Clutch not found" in response.json().get('detail', '')
        print(f"Non-existent clutch correctly returns 404")


class TestEmailSettings:
    """Tests for email settings endpoints"""
    
    def test_get_settings(self, api_client):
        """Test GET /api/settings returns both breeding and email settings"""
        response = api_client.get(f"{BASE_URL}/api/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'breeding' in data
        assert 'email' in data
        print(f"Settings retrieved successfully: breeding={bool(data['breeding'])}, email={bool(data['email'])}")
    
    def test_save_email_settings(self, api_client):
        """Test POST /api/settings/email saves settings correctly"""
        test_email_settings = {
            "notification_email": "testuser@example.com",
            "email_enabled": True,
            "smtp_email": "sender@gmail.com",
            "smtp_password": "test-app-password"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/settings/email",
            json=test_email_settings
        )
        
        assert response.status_code == 200
        assert response.json().get('message') == 'Email settings saved'
        
        # Verify settings were actually saved
        get_response = api_client.get(f"{BASE_URL}/api/settings")
        assert get_response.status_code == 200
        saved_email = get_response.json().get('email', {})
        
        assert saved_email.get('notification_email') == test_email_settings['notification_email']
        assert saved_email.get('email_enabled') == test_email_settings['email_enabled']
        assert saved_email.get('smtp_email') == test_email_settings['smtp_email']
        assert saved_email.get('smtp_password') == test_email_settings['smtp_password']
        print("Email settings saved and verified successfully")
    
    def test_save_partial_email_settings(self, api_client):
        """Test saving only some email settings"""
        partial_settings = {
            "notification_email": "partial@example.com",
            "email_enabled": False,
            "smtp_email": "",
            "smtp_password": ""
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/settings/email",
            json=partial_settings
        )
        
        assert response.status_code == 200
        print("Partial email settings saved successfully")


class TestEmailEndpoint:
    """Tests for POST /api/settings/test-email endpoint"""
    
    def test_test_email_without_notification_email(self, api_client):
        """Test that test-email fails without notification email configured"""
        # First, clear the notification email
        api_client.post(
            f"{BASE_URL}/api/settings/email",
            json={
                "notification_email": "",
                "email_enabled": False,
                "smtp_email": "",
                "smtp_password": ""
            }
        )
        
        response = api_client.post(f"{BASE_URL}/api/settings/test-email")
        
        assert response.status_code == 400
        assert "No notification email configured" in response.json().get('detail', '')
        print("Test email correctly fails without notification email")
    
    def test_test_email_without_smtp_credentials(self, api_client):
        """Test that test-email returns proper error when SMTP credentials missing"""
        # Set notification email but no SMTP credentials
        api_client.post(
            f"{BASE_URL}/api/settings/email",
            json={
                "notification_email": "notify@example.com",
                "email_enabled": True,
                "smtp_email": "",
                "smtp_password": ""
            }
        )
        
        response = api_client.post(f"{BASE_URL}/api/settings/test-email")
        
        assert response.status_code == 400
        data = response.json()
        assert "SMTP credentials not configured" in data.get('detail', '')
        print(f"Test email correctly returns: {data.get('detail')}")
    
    def test_test_email_with_invalid_credentials(self, api_client):
        """Test that test-email fails with invalid credentials (expected behavior)"""
        # Set invalid SMTP credentials
        api_client.post(
            f"{BASE_URL}/api/settings/email",
            json={
                "notification_email": "notify@example.com",
                "email_enabled": True,
                "smtp_email": "invalid@gmail.com",
                "smtp_password": "invalid-password"
            }
        )
        
        response = api_client.post(f"{BASE_URL}/api/settings/test-email")
        
        # This should fail with 500 because credentials are invalid
        assert response.status_code == 500
        assert "Failed to send test email" in response.json().get('detail', '')
        print("Test email correctly fails with invalid credentials")


class TestClutchStatusAndEggInteraction:
    """Tests for clutch status transitions and egg interactions"""
    
    def test_clutch_status_flow(self, api_client):
        """Test complete clutch lifecycle: laying -> incubating -> hatching -> completed"""
        # Get existing pair or create one
        pairs_res = api_client.get(f"{BASE_URL}/api/pairs")
        pairs = pairs_res.json()
        
        if pairs:
            pair_id = pairs[0]['id']
        else:
            pytest.skip("No pairs available for testing clutch flow")
        
        # Create a new clutch
        clutch_res = api_client.post(f"{BASE_URL}/api/clutches", json={
            "pair_id": pair_id,
            "notes": "TEST_Lifecycle_Clutch"
        })
        assert clutch_res.status_code == 200
        clutch = clutch_res.json()
        clutch_id = clutch['id']
        
        try:
            # Verify initial status is 'laying'
            assert clutch['status'] == 'laying'
            print("Step 1: Clutch created with 'laying' status")
            
            # Add eggs
            for i in range(2):
                api_client.post(f"{BASE_URL}/api/clutches/{clutch_id}/eggs", json={})
            
            # Transition to incubating
            update_res = api_client.put(f"{BASE_URL}/api/clutches/{clutch_id}", json={
                "status": "incubating",
                "incubation_start": "2026-01-15"
            })
            assert update_res.status_code == 200
            clutch = update_res.json()
            assert clutch['status'] == 'incubating'
            assert clutch['expected_hatch_date'] is not None
            print(f"Step 2: Clutch transitioned to 'incubating', expected hatch: {clutch['expected_hatch_date']}")
            
            # Transition to hatching
            update_res = api_client.put(f"{BASE_URL}/api/clutches/{clutch_id}", json={
                "status": "hatching"
            })
            assert update_res.status_code == 200
            clutch = update_res.json()
            assert clutch['status'] == 'hatching'
            print("Step 3: Clutch transitioned to 'hatching'")
            
            # Transition to completed
            update_res = api_client.put(f"{BASE_URL}/api/clutches/{clutch_id}", json={
                "status": "completed"
            })
            assert update_res.status_code == 200
            clutch = update_res.json()
            assert clutch['status'] == 'completed'
            print("Step 4: Clutch transitioned to 'completed'")
            
        finally:
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/clutches/{clutch_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
