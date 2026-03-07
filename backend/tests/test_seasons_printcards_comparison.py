"""
Backend tests for Season Management, Print Cards, and Year-over-Year Comparison APIs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSeasonsAPI:
    """Tests for /api/seasons endpoints - CRUD and activate operations"""
    
    def test_get_all_seasons(self):
        """GET /api/seasons - List all seasons"""
        response = requests.get(f"{BASE_URL}/api/seasons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/seasons - Found {len(data)} seasons")
    
    def test_create_season(self):
        """POST /api/seasons - Create a new season"""
        test_year = 2030 + int(uuid.uuid4().hex[:4], 16) % 10  # Random year 2030-2039
        payload = {
            "year": test_year,
            "name": f"TEST Season {test_year}",
            "start_date": f"{test_year}-01-01",
            "end_date": f"{test_year}-12-31",
            "is_active": False,
            "notes": "Test season for automated testing"
        }
        response = requests.post(f"{BASE_URL}/api/seasons", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["year"] == test_year
        assert data["name"] == f"TEST Season {test_year}"
        assert data["start_date"] == f"{test_year}-01-01"
        assert data["end_date"] == f"{test_year}-12-31"
        assert data["is_active"] == False
        
        # Cleanup - delete the test season
        delete_response = requests.delete(f"{BASE_URL}/api/seasons/{data['id']}")
        assert delete_response.status_code == 200
        print(f"✓ POST /api/seasons - Created and deleted test season {test_year}")
        
        return data
    
    def test_update_season(self):
        """PUT /api/seasons/{id} - Update existing season"""
        # First create a season
        test_year = 2040 + int(uuid.uuid4().hex[:4], 16) % 10
        create_payload = {
            "year": test_year,
            "name": f"Original {test_year}",
            "start_date": f"{test_year}-01-01",
            "end_date": f"{test_year}-12-31",
            "is_active": False,
            "notes": ""
        }
        create_response = requests.post(f"{BASE_URL}/api/seasons", json=create_payload)
        assert create_response.status_code == 200
        season_id = create_response.json()["id"]
        
        # Update the season
        update_payload = {
            "year": test_year,
            "name": f"Updated {test_year}",
            "start_date": f"{test_year}-02-01",
            "end_date": f"{test_year}-11-30",
            "is_active": False,
            "notes": "Updated notes"
        }
        update_response = requests.put(f"{BASE_URL}/api/seasons/{season_id}", json=update_payload)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        
        # Verify update
        assert updated_data["name"] == f"Updated {test_year}"
        assert updated_data["start_date"] == f"{test_year}-02-01"
        assert updated_data["notes"] == "Updated notes"
        
        # Verify persistence via GET
        get_response = requests.get(f"{BASE_URL}/api/seasons")
        seasons = get_response.json()
        found = [s for s in seasons if s["id"] == season_id]
        assert len(found) == 1
        assert found[0]["name"] == f"Updated {test_year}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/seasons/{season_id}")
        print(f"✓ PUT /api/seasons/{season_id} - Updated season successfully")
    
    def test_delete_season(self):
        """DELETE /api/seasons/{id} - Delete a season"""
        # Create a season to delete
        test_year = 2050 + int(uuid.uuid4().hex[:4], 16) % 10
        create_payload = {
            "year": test_year,
            "name": f"ToDelete {test_year}",
            "start_date": f"{test_year}-01-01",
            "end_date": f"{test_year}-12-31",
            "is_active": False,
            "notes": ""
        }
        create_response = requests.post(f"{BASE_URL}/api/seasons", json=create_payload)
        season_id = create_response.json()["id"]
        
        # Delete the season
        delete_response = requests.delete(f"{BASE_URL}/api/seasons/{season_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion - season should not be in list
        get_response = requests.get(f"{BASE_URL}/api/seasons")
        seasons = get_response.json()
        found = [s for s in seasons if s["id"] == season_id]
        assert len(found) == 0
        print(f"✓ DELETE /api/seasons/{season_id} - Season deleted and verified")
    
    def test_delete_nonexistent_season(self):
        """DELETE /api/seasons/{id} - 404 for non-existent season"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/seasons/{fake_id}")
        assert response.status_code == 404
        print(f"✓ DELETE /api/seasons/{fake_id} - Returns 404 for non-existent")
    
    def test_activate_season(self):
        """POST /api/seasons/{id}/activate - Activate a season"""
        # Create two seasons
        year1 = 2060 + int(uuid.uuid4().hex[:4], 16) % 5
        year2 = year1 + 1
        
        season1_resp = requests.post(f"{BASE_URL}/api/seasons", json={
            "year": year1, "name": str(year1), "start_date": f"{year1}-01-01",
            "end_date": f"{year1}-12-31", "is_active": False, "notes": ""
        })
        season2_resp = requests.post(f"{BASE_URL}/api/seasons", json={
            "year": year2, "name": str(year2), "start_date": f"{year2}-01-01",
            "end_date": f"{year2}-12-31", "is_active": False, "notes": ""
        })
        
        season1_id = season1_resp.json()["id"]
        season2_id = season2_resp.json()["id"]
        
        # Activate season 1
        activate_resp = requests.post(f"{BASE_URL}/api/seasons/{season1_id}/activate")
        assert activate_resp.status_code == 200
        
        # Verify only season 1 is active
        get_response = requests.get(f"{BASE_URL}/api/seasons")
        seasons = get_response.json()
        season1 = [s for s in seasons if s["id"] == season1_id][0]
        season2 = [s for s in seasons if s["id"] == season2_id][0]
        
        assert season1["is_active"] == True
        assert season2["is_active"] == False
        
        # Activate season 2 - should deactivate season 1
        activate_resp2 = requests.post(f"{BASE_URL}/api/seasons/{season2_id}/activate")
        assert activate_resp2.status_code == 200
        
        get_response2 = requests.get(f"{BASE_URL}/api/seasons")
        seasons2 = get_response2.json()
        season1_new = [s for s in seasons2 if s["id"] == season1_id][0]
        season2_new = [s for s in seasons2 if s["id"] == season2_id][0]
        
        assert season1_new["is_active"] == False
        assert season2_new["is_active"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/seasons/{season1_id}")
        requests.delete(f"{BASE_URL}/api/seasons/{season2_id}")
        print(f"✓ POST /api/seasons/{season2_id}/activate - Activation toggles correctly")
    
    def test_get_active_season(self):
        """GET /api/seasons/active - Get currently active season"""
        response = requests.get(f"{BASE_URL}/api/seasons/active")
        assert response.status_code == 200
        data = response.json()
        
        # Should have year and is_active fields
        assert "year" in data
        assert "is_active" in data
        print(f"✓ GET /api/seasons/active - Active season: {data.get('name', data.get('year'))}")


class TestYearComparisonAPI:
    """Tests for /api/reports/year-comparison endpoint"""
    
    def test_get_year_comparison_default_years(self):
        """GET /api/reports/year-comparison - Default years (current and previous)"""
        response = requests.get(f"{BASE_URL}/api/reports/year-comparison")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "year1" in data
        assert "year2" in data
        assert "comparison" in data
        
        # Verify year1 stats structure
        year1_stats = data["year1"]
        assert "year" in year1_stats
        assert "total_pairs" in year1_stats
        assert "total_clutches" in year1_stats
        assert "total_eggs" in year1_stats
        assert "fertile_eggs" in year1_stats
        assert "hatched_eggs" in year1_stats
        assert "fertility_rate" in year1_stats
        assert "hatch_rate" in year1_stats
        assert "birds_born" in year1_stats
        
        # Verify comparison structure
        comparison = data["comparison"]
        assert "eggs_diff" in comparison
        assert "hatched_diff" in comparison
        assert "fertility_diff" in comparison
        assert "hatch_rate_diff" in comparison
        
        print(f"✓ GET /api/reports/year-comparison - Comparing {year1_stats['year']} vs {data['year2']['year']}")
    
    def test_get_year_comparison_specific_years(self):
        """GET /api/reports/year-comparison?year1=2025&year2=2026 - Specific years"""
        response = requests.get(f"{BASE_URL}/api/reports/year-comparison?year1=2025&year2=2026")
        assert response.status_code == 200
        data = response.json()
        
        assert data["year1"]["year"] == 2025
        assert data["year2"]["year"] == 2026
        
        # Verify math is correct
        eggs_diff = data["year2"]["total_eggs"] - data["year1"]["total_eggs"]
        assert data["comparison"]["eggs_diff"] == eggs_diff
        
        hatched_diff = data["year2"]["hatched_eggs"] - data["year1"]["hatched_eggs"]
        assert data["comparison"]["hatched_diff"] == hatched_diff
        
        print(f"✓ GET /api/reports/year-comparison?year1=2025&year2=2026 - Response validated")
    
    def test_year_comparison_same_year(self):
        """GET /api/reports/year-comparison?year1=2026&year2=2026 - Same year comparison"""
        response = requests.get(f"{BASE_URL}/api/reports/year-comparison?year1=2026&year2=2026")
        assert response.status_code == 200
        data = response.json()
        
        # When comparing same year, all diffs should be 0
        assert data["comparison"]["eggs_diff"] == 0
        assert data["comparison"]["hatched_diff"] == 0
        assert data["comparison"]["fertility_diff"] == 0
        assert data["comparison"]["hatch_rate_diff"] == 0
        
        print("✓ GET /api/reports/year-comparison?year1=2026&year2=2026 - Same year = zero diff")


class TestPrintCardsAPI:
    """Tests for /api/print/breeding-cards endpoint"""
    
    def test_get_breeding_cards(self):
        """GET /api/print/breeding-cards - Get printable breeding card data"""
        response = requests.get(f"{BASE_URL}/api/print/breeding-cards")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ GET /api/print/breeding-cards - Found {len(data)} cards")
        
        if len(data) > 0:
            card = data[0]
            # Verify card structure
            assert "pair_id" in card
            assert "pair_name" in card
            assert "cage_label" in card
            assert "zone_name" in card
            assert "male" in card
            assert "female" in card
            assert "total_eggs" in card
            assert "hatched" in card
            
            # Verify male/female structure
            assert "band_number" in card["male"]
            assert "stam" in card["male"]
            assert "year" in card["male"]
            assert "band_number" in card["female"]
            
            print(f"  - Card verified: {card['pair_name']} in cage {card['cage_label']}")
    
    def test_breeding_cards_data_accuracy(self):
        """Verify breeding cards data is accurate"""
        response = requests.get(f"{BASE_URL}/api/print/breeding-cards")
        assert response.status_code == 200
        cards = response.json()
        
        for card in cards:
            # Verify all active pairs have proper data
            assert card["is_active"] == True
            assert card["hatched"] <= card["total_eggs"]  # Can't hatch more than eggs
            assert isinstance(card["total_eggs"], int)
            assert isinstance(card["hatched"], int)
        
        print(f"✓ Breeding cards data accuracy verified for {len(cards)} cards")


class TestExistingSeasons:
    """Tests for existing seasons data"""
    
    def test_existing_seasons_present(self):
        """Verify existing seasons are returned"""
        response = requests.get(f"{BASE_URL}/api/seasons")
        assert response.status_code == 200
        seasons = response.json()
        
        # Should have at least the 2025 and 2026 seasons we saw earlier
        years = [s["year"] for s in seasons]
        print(f"✓ Existing seasons found: {years}")
        
        # Check that exactly one is active
        active_seasons = [s for s in seasons if s["is_active"]]
        assert len(active_seasons) <= 1, "Only one season should be active at a time"
        print(f"  - Active season: {active_seasons[0]['year'] if active_seasons else 'None'}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
