"""
Season Data Isolation Tests
Tests per-season data isolation - each breeding season should have its own isolated data
(zones, cages, pairs, clutches), while birds remain global and usable across seasons.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://canary-breed-dev.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test_season@test.com"
TEST_PASSWORD = "password123"

# Known season IDs from the database
SEASON_2025_ID = "4948786f-205b-4d68-90cf-ed346cb2b5a3"  # Temporada 2025 (has data: 1 pair, 1 zone, 1 clutch)
SEASON_2026_ID = "1b0cd1e0-f633-4895-8022-782d34cd2c0c"  # Temporada 2026 (empty)


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(autouse=True)
def restore_season_2025(api_client):
    """Ensure Temporada 2025 is active before and after each test"""
    # Setup: Activate Temporada 2025
    api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
    yield
    # Teardown: Ensure Temporada 2025 is active
    api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")


class TestSeasonActivation:
    """Tests for season activation and switching"""
    
    def test_get_all_seasons(self, api_client):
        """Verify all seasons are returned"""
        response = api_client.get(f"{BASE_URL}/api/seasons")
        assert response.status_code == 200
        seasons = response.json()
        assert len(seasons) >= 2, "Should have at least 2 seasons"
        
        # Verify our test seasons exist
        season_names = [s["name"] for s in seasons]
        assert "Temporada 2025" in season_names
        assert "Temporada 2026" in season_names
    
    def test_get_active_season(self, api_client):
        """Verify active season endpoint returns correct season"""
        response = api_client.get(f"{BASE_URL}/api/seasons/active")
        assert response.status_code == 200
        active_season = response.json()
        assert "id" in active_season
        assert "name" in active_season
        assert active_season["is_active"] == True
    
    def test_activate_season_2026(self, api_client):
        """Test switching to Temporada 2026"""
        # Activate 2026
        response = api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        assert response.status_code == 200
        
        # Verify it's now active
        response = api_client.get(f"{BASE_URL}/api/seasons/active")
        assert response.status_code == 200
        assert response.json()["id"] == SEASON_2026_ID
        assert response.json()["name"] == "Temporada 2026"
    
    def test_activate_season_2025(self, api_client):
        """Test switching to Temporada 2025"""
        # First switch to 2026
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        
        # Now activate 2025
        response = api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
        assert response.status_code == 200
        
        # Verify it's now active
        response = api_client.get(f"{BASE_URL}/api/seasons/active")
        assert response.status_code == 200
        assert response.json()["id"] == SEASON_2025_ID
        assert response.json()["name"] == "Temporada 2025"


class TestBirdsGlobal:
    """Tests that birds are global and not filtered by season"""
    
    def test_birds_count_with_season_2025(self, api_client):
        """Birds count should be 13 with Temporada 2025 active"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/birds")
        assert response.status_code == 200
        birds = response.json()
        assert len(birds) == 13, f"Expected 13 birds, got {len(birds)}"
    
    def test_birds_count_with_season_2026(self, api_client):
        """Birds count should still be 13 with Temporada 2026 active"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/birds")
        assert response.status_code == 200
        birds = response.json()
        assert len(birds) == 13, f"Expected 13 birds (global), got {len(birds)}"


class TestSeasonDataIsolation2025:
    """Tests data isolation for Temporada 2025 (has 1 pair, 1 zone, 1 clutch)"""
    
    def test_pairs_in_season_2025(self, api_client):
        """With Temporada 2025 active, should see 1 pair"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/pairs")
        assert response.status_code == 200
        pairs = response.json()
        assert len(pairs) == 1, f"Expected 1 pair for Temporada 2025, got {len(pairs)}"
        assert pairs[0]["season_id"] == SEASON_2025_ID
    
    def test_zones_in_season_2025(self, api_client):
        """With Temporada 2025 active, should see 1 zone"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        zones = response.json()
        assert len(zones) == 1, f"Expected 1 zone for Temporada 2025, got {len(zones)}"
        assert zones[0]["season_id"] == SEASON_2025_ID
    
    def test_clutches_in_season_2025(self, api_client):
        """With Temporada 2025 active, should see 1 clutch"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/clutches")
        assert response.status_code == 200
        clutches = response.json()
        assert len(clutches) == 1, f"Expected 1 clutch for Temporada 2025, got {len(clutches)}"
        assert clutches[0]["season_id"] == SEASON_2025_ID


class TestSeasonDataIsolation2026:
    """Tests data isolation for Temporada 2026 (empty season)"""
    
    def test_pairs_in_season_2026(self, api_client):
        """With Temporada 2026 active, should see 0 pairs"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/pairs")
        assert response.status_code == 200
        pairs = response.json()
        assert len(pairs) == 0, f"Expected 0 pairs for Temporada 2026, got {len(pairs)}"
    
    def test_zones_in_season_2026(self, api_client):
        """With Temporada 2026 active, should see 0 zones"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        zones = response.json()
        assert len(zones) == 0, f"Expected 0 zones for Temporada 2026, got {len(zones)}"
    
    def test_clutches_in_season_2026(self, api_client):
        """With Temporada 2026 active, should see 0 clutches"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/clutches")
        assert response.status_code == 200
        clutches = response.json()
        assert len(clutches) == 0, f"Expected 0 clutches for Temporada 2026, got {len(clutches)}"


class TestDashboardStatsIsolation:
    """Tests that dashboard stats reflect active season"""
    
    def test_dashboard_stats_season_2025(self, api_client):
        """Dashboard stats should show Temporada 2025 data: 1 pair, 1 clutch, 13 birds"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        stats = response.json()
        
        # Birds are global
        assert stats["total_birds"] == 13, f"Expected 13 birds, got {stats['total_birds']}"
        # Pairs/clutches filtered by season
        assert stats["total_pairs"] == 1, f"Expected 1 pair for 2025, got {stats['total_pairs']}"
        assert stats["total_clutches"] == 1, f"Expected 1 clutch for 2025, got {stats['total_clutches']}"
    
    def test_dashboard_stats_season_2026(self, api_client):
        """Dashboard stats should show Temporada 2026 data: 0 pairs, 0 clutches, 13 birds"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        
        response = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        stats = response.json()
        
        # Birds are global
        assert stats["total_birds"] == 13, f"Expected 13 birds (global), got {stats['total_birds']}"
        # Pairs/clutches filtered by season
        assert stats["total_pairs"] == 0, f"Expected 0 pairs for 2026, got {stats['total_pairs']}"
        assert stats["total_clutches"] == 0, f"Expected 0 clutches for 2026, got {stats['total_clutches']}"


class TestCreateDataInSeason:
    """Tests creating new data associates with active season"""
    
    def test_create_zone_in_season_2026(self, api_client):
        """Creating a zone in Temporada 2026 should associate with that season"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        
        # Create zone
        response = api_client.post(f"{BASE_URL}/api/zones", json={
            "name": "TEST_Zone_Isolation",
            "rows": 2,
            "columns": 2
        })
        assert response.status_code == 200
        zone = response.json()
        zone_id = zone["id"]
        
        try:
            # Verify season_id
            assert zone["season_id"] == SEASON_2026_ID, "Zone should be associated with Temporada 2026"
            
            # Verify zone appears in 2026
            response = api_client.get(f"{BASE_URL}/api/zones")
            zones = response.json()
            assert len(zones) == 1
            assert zones[0]["name"] == "TEST_Zone_Isolation"
            
            # Switch to 2025 and verify zone is NOT visible
            api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
            response = api_client.get(f"{BASE_URL}/api/zones")
            zones = response.json()
            zone_names = [z["name"] for z in zones]
            assert "TEST_Zone_Isolation" not in zone_names, "Zone from 2026 should not appear in 2025"
        finally:
            # Cleanup
            api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
            api_client.delete(f"{BASE_URL}/api/zones/{zone_id}")
    
    def test_create_pair_in_season_2026(self, api_client):
        """Creating a pair in Temporada 2026 should associate with that season"""
        api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
        
        # Create zone and cage first
        zone_response = api_client.post(f"{BASE_URL}/api/zones", json={
            "name": "TEST_Zone_For_Pair",
            "rows": 1,
            "columns": 1
        })
        zone_id = zone_response.json()["id"]
        api_client.post(f"{BASE_URL}/api/zones/{zone_id}/generate-cages")
        
        cages_response = api_client.get(f"{BASE_URL}/api/cages?zone_id={zone_id}")
        cage_id = cages_response.json()[0]["id"]
        
        # Create pair
        response = api_client.post(f"{BASE_URL}/api/pairs", json={
            "name": "TEST_Pair_Isolation",
            "cage_id": cage_id
        })
        assert response.status_code == 200
        pair = response.json()
        pair_id = pair["id"]
        
        try:
            # Verify season_id
            assert pair["season_id"] == SEASON_2026_ID, "Pair should be associated with Temporada 2026"
            
            # Verify pair appears in 2026
            response = api_client.get(f"{BASE_URL}/api/pairs")
            pairs = response.json()
            assert len(pairs) == 1
            assert pairs[0]["name"] == "TEST_Pair_Isolation"
            
            # Switch to 2025 and verify pair is NOT visible
            api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2025_ID}/activate")
            response = api_client.get(f"{BASE_URL}/api/pairs")
            pairs = response.json()
            pair_names = [p["name"] for p in pairs]
            assert "TEST_Pair_Isolation" not in pair_names, "Pair from 2026 should not appear in 2025"
        finally:
            # Cleanup
            api_client.post(f"{BASE_URL}/api/seasons/{SEASON_2026_ID}/activate")
            api_client.delete(f"{BASE_URL}/api/pairs/{pair_id}")
            api_client.delete(f"{BASE_URL}/api/zones/{zone_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
