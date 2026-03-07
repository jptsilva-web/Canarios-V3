"""
Test cases for new Canary Breeding Management features:
1. Breeding Statistics Reports - GET /api/reports/breeding-stats
2. Bird Genealogy - GET /api/birds/{bird_id}/genealogy
3. Export APIs - CSV and PDF exports for birds and breeding reports
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


class TestBreedingStatsAPI:
    """Tests for GET /api/reports/breeding-stats endpoint"""
    
    def test_get_breeding_stats_returns_200(self, api_client):
        """Test that breeding stats endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/reports/breeding-stats")
        assert response.status_code == 200
        print("Breeding stats endpoint returns 200 OK")
    
    def test_breeding_stats_structure(self, api_client):
        """Test that breeding stats response has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/reports/breeding-stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
            'total_eggs', 'fertile_eggs', 'infertile_eggs', 'hatched_eggs', 
            'dead_eggs', 'fertility_rate', 'hatch_rate', 'survival_rate',
            'total_clutches', 'completed_clutches', 'active_clutches',
            'avg_eggs_per_clutch', 'avg_hatched_per_clutch'
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Breeding stats structure verified - all {len(expected_fields)} fields present")
        print(f"Stats: total_eggs={data['total_eggs']}, fertility_rate={data['fertility_rate']}%, hatch_rate={data['hatch_rate']}%")
    
    def test_breeding_stats_values_are_numeric(self, api_client):
        """Test that breeding stats values are numeric types"""
        response = api_client.get(f"{BASE_URL}/api/reports/breeding-stats")
        assert response.status_code == 200
        data = response.json()
        
        # Integer fields
        int_fields = ['total_eggs', 'fertile_eggs', 'infertile_eggs', 'hatched_eggs', 
                      'dead_eggs', 'total_clutches', 'completed_clutches', 'active_clutches']
        for field in int_fields:
            assert isinstance(data[field], int), f"{field} should be int, got {type(data[field])}"
        
        # Float/number fields (rates)
        float_fields = ['fertility_rate', 'hatch_rate', 'survival_rate', 
                        'avg_eggs_per_clutch', 'avg_hatched_per_clutch']
        for field in float_fields:
            assert isinstance(data[field], (int, float)), f"{field} should be numeric, got {type(data[field])}"
        
        print("All breeding stats values are correct numeric types")


class TestGenealogyAPI:
    """Tests for GET /api/birds/{bird_id}/genealogy endpoint"""
    
    @pytest.fixture(scope="class")
    def test_bird_family(self, api_client):
        """Create a test bird family for genealogy testing (grandparent -> parent -> child)"""
        # Create grandparent male
        grandpa = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_GP_M_{uuid.uuid4().hex[:6]}",
            "band_year": 2023,
            "gender": "male",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1"
        }).json()
        
        # Create grandparent female
        grandma = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_GP_F_{uuid.uuid4().hex[:6]}",
            "band_year": 2023,
            "gender": "female",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1"
        }).json()
        
        # Create parent male (child of grandparents)
        father = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_P_M_{uuid.uuid4().hex[:6]}",
            "band_year": 2024,
            "gender": "male",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1",
            "parent_male_id": grandpa['id'],
            "parent_female_id": grandma['id']
        }).json()
        
        # Create parent female
        mother = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_P_F_{uuid.uuid4().hex[:6]}",
            "band_year": 2024,
            "gender": "female",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1"
        }).json()
        
        # Create child bird
        child = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_C_{uuid.uuid4().hex[:6]}",
            "band_year": 2025,
            "gender": "male",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1",
            "parent_male_id": father['id'],
            "parent_female_id": mother['id']
        }).json()
        
        # Create sibling
        sibling = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_S_{uuid.uuid4().hex[:6]}",
            "band_year": 2025,
            "gender": "female",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1",
            "parent_male_id": father['id'],
            "parent_female_id": mother['id']
        }).json()
        
        yield {
            'grandpa': grandpa,
            'grandma': grandma,
            'father': father,
            'mother': mother,
            'child': child,
            'sibling': sibling
        }
        
        # Cleanup
        for bird in [sibling, child, father, mother, grandma, grandpa]:
            api_client.delete(f"{BASE_URL}/api/birds/{bird['id']}")
    
    def test_get_genealogy_returns_200(self, api_client):
        """Test that genealogy endpoint returns 200 for existing bird"""
        # Get any existing bird
        birds_res = api_client.get(f"{BASE_URL}/api/birds")
        birds = birds_res.json()
        
        if not birds:
            pytest.skip("No birds available for genealogy test")
        
        bird_id = birds[0]['id']
        response = api_client.get(f"{BASE_URL}/api/birds/{bird_id}/genealogy")
        
        assert response.status_code == 200
        print(f"Genealogy endpoint returns 200 for bird {bird_id}")
    
    def test_get_genealogy_nonexistent_bird_returns_404(self, api_client):
        """Test that genealogy endpoint returns 404 for non-existent bird"""
        fake_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/birds/{fake_id}/genealogy")
        
        assert response.status_code == 404
        assert "Bird not found" in response.json().get('detail', '')
        print("Genealogy endpoint correctly returns 404 for non-existent bird")
    
    def test_genealogy_structure(self, api_client):
        """Test that genealogy response has correct structure"""
        birds_res = api_client.get(f"{BASE_URL}/api/birds")
        birds = birds_res.json()
        
        if not birds:
            pytest.skip("No birds available for genealogy test")
        
        bird_id = birds[0]['id']
        response = api_client.get(f"{BASE_URL}/api/birds/{bird_id}/genealogy")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert 'bird' in data, "Missing 'bird' field"
        assert 'parents' in data, "Missing 'parents' field"
        assert 'grandparents' in data, "Missing 'grandparents' field"
        assert 'children' in data, "Missing 'children' field"
        assert 'siblings' in data, "Missing 'siblings' field"
        
        # Check nested structure
        assert 'male' in data['parents']
        assert 'female' in data['parents']
        assert 'paternal' in data['grandparents']
        assert 'maternal' in data['grandparents']
        
        print("Genealogy structure verified - all required fields present")
    
    def test_genealogy_returns_parents(self, api_client, test_bird_family):
        """Test that genealogy returns correct parents"""
        child = test_bird_family['child']
        father = test_bird_family['father']
        mother = test_bird_family['mother']
        
        response = api_client.get(f"{BASE_URL}/api/birds/{child['id']}/genealogy")
        assert response.status_code == 200
        data = response.json()
        
        assert data['parents']['male'] is not None, "Father should be present"
        assert data['parents']['female'] is not None, "Mother should be present"
        assert data['parents']['male']['id'] == father['id'], "Father ID should match"
        assert data['parents']['female']['id'] == mother['id'], "Mother ID should match"
        
        print(f"Genealogy correctly returns parents: father={father['band_number']}, mother={mother['band_number']}")
    
    def test_genealogy_returns_grandparents(self, api_client, test_bird_family):
        """Test that genealogy returns correct grandparents"""
        child = test_bird_family['child']
        grandpa = test_bird_family['grandpa']
        grandma = test_bird_family['grandma']
        
        response = api_client.get(f"{BASE_URL}/api/birds/{child['id']}/genealogy")
        assert response.status_code == 200
        data = response.json()
        
        assert data['grandparents']['paternal']['male'] is not None, "Paternal grandfather should be present"
        assert data['grandparents']['paternal']['female'] is not None, "Paternal grandmother should be present"
        assert data['grandparents']['paternal']['male']['id'] == grandpa['id']
        assert data['grandparents']['paternal']['female']['id'] == grandma['id']
        
        print(f"Genealogy correctly returns grandparents: grandpa={grandpa['band_number']}, grandma={grandma['band_number']}")
    
    def test_genealogy_returns_siblings(self, api_client, test_bird_family):
        """Test that genealogy returns correct siblings"""
        child = test_bird_family['child']
        sibling = test_bird_family['sibling']
        
        response = api_client.get(f"{BASE_URL}/api/birds/{child['id']}/genealogy")
        assert response.status_code == 200
        data = response.json()
        
        sibling_ids = [s['id'] for s in data['siblings']]
        assert sibling['id'] in sibling_ids, "Sibling should be in siblings list"
        
        print(f"Genealogy correctly returns sibling: {sibling['band_number']}")
    
    def test_genealogy_returns_children(self, api_client, test_bird_family):
        """Test that genealogy returns correct children"""
        father = test_bird_family['father']
        child = test_bird_family['child']
        sibling = test_bird_family['sibling']
        
        response = api_client.get(f"{BASE_URL}/api/birds/{father['id']}/genealogy")
        assert response.status_code == 200
        data = response.json()
        
        children_ids = [c['id'] for c in data['children']]
        assert child['id'] in children_ids, "Child should be in children list"
        assert sibling['id'] in children_ids, "Sibling (as child of father) should be in children list"
        
        print(f"Genealogy correctly returns children for father: {len(data['children'])} children found")


class TestExportAPIs:
    """Tests for export endpoints"""
    
    def test_export_birds_csv(self, api_client):
        """Test GET /api/export/birds/csv returns CSV file"""
        response = api_client.get(f"{BASE_URL}/api/export/birds/csv")
        
        assert response.status_code == 200
        assert 'text/csv' in response.headers.get('Content-Type', '')
        assert 'Content-Disposition' in response.headers
        assert 'birds_export.csv' in response.headers.get('Content-Disposition', '')
        
        # Verify CSV content has header
        content = response.text
        assert 'Band Number' in content or 'band_number' in content.lower()
        
        print(f"Birds CSV export successful - {len(content)} bytes received")
    
    def test_export_birds_pdf(self, api_client):
        """Test GET /api/export/birds/pdf returns PDF file"""
        response = api_client.get(f"{BASE_URL}/api/export/birds/pdf")
        
        assert response.status_code == 200
        assert 'application/pdf' in response.headers.get('Content-Type', '')
        assert 'Content-Disposition' in response.headers
        assert 'birds_export.pdf' in response.headers.get('Content-Disposition', '')
        
        # Verify PDF content starts with PDF header
        content = response.content
        assert content[:4] == b'%PDF', "PDF should start with %PDF header"
        
        print(f"Birds PDF export successful - {len(content)} bytes received")
    
    def test_export_breeding_report_csv(self, api_client):
        """Test GET /api/export/breeding-report/csv returns CSV file"""
        response = api_client.get(f"{BASE_URL}/api/export/breeding-report/csv")
        
        assert response.status_code == 200
        assert 'text/csv' in response.headers.get('Content-Type', '')
        assert 'Content-Disposition' in response.headers
        assert 'breeding_report.csv' in response.headers.get('Content-Disposition', '')
        
        # Verify CSV content has header
        content = response.text
        assert 'Pair Name' in content or 'pair' in content.lower()
        
        print(f"Breeding report CSV export successful - {len(content)} bytes received")
    
    def test_export_breeding_report_pdf(self, api_client):
        """Test GET /api/export/breeding-report/pdf returns PDF file"""
        response = api_client.get(f"{BASE_URL}/api/export/breeding-report/pdf")
        
        assert response.status_code == 200
        assert 'application/pdf' in response.headers.get('Content-Type', '')
        assert 'Content-Disposition' in response.headers
        assert 'breeding_report.pdf' in response.headers.get('Content-Disposition', '')
        
        # Verify PDF content starts with PDF header
        content = response.content
        assert content[:4] == b'%PDF', "PDF should start with %PDF header"
        
        print(f"Breeding report PDF export successful - {len(content)} bytes received")


class TestBirdParentFields:
    """Tests for bird parent fields (parent_male_id, parent_female_id)"""
    
    def test_create_bird_with_parents(self, api_client):
        """Test creating a bird with parent references"""
        # Create parent birds first
        parent_male = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_PM_{uuid.uuid4().hex[:6]}",
            "band_year": 2024,
            "gender": "male",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1"
        }).json()
        
        parent_female = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_PF_{uuid.uuid4().hex[:6]}",
            "band_year": 2024,
            "gender": "female",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1"
        }).json()
        
        # Create child with parent references
        child = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_CHILD_{uuid.uuid4().hex[:6]}",
            "band_year": 2025,
            "gender": "male",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1",
            "parent_male_id": parent_male['id'],
            "parent_female_id": parent_female['id']
        })
        
        assert child.status_code == 200
        child_data = child.json()
        
        assert child_data['parent_male_id'] == parent_male['id']
        assert child_data['parent_female_id'] == parent_female['id']
        
        print(f"Bird created successfully with parent references")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/birds/{child_data['id']}")
        api_client.delete(f"{BASE_URL}/api/birds/{parent_male['id']}")
        api_client.delete(f"{BASE_URL}/api/birds/{parent_female['id']}")
    
    def test_update_bird_parent_fields(self, api_client):
        """Test updating bird parent fields"""
        # Create test birds
        bird1 = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_B1_{uuid.uuid4().hex[:6]}",
            "band_year": 2024,
            "gender": "male",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1"
        }).json()
        
        bird2 = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_B2_{uuid.uuid4().hex[:6]}",
            "band_year": 2024,
            "gender": "female",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1"
        }).json()
        
        bird3 = api_client.post(f"{BASE_URL}/api/birds", json={
            "band_number": f"TEST_B3_{uuid.uuid4().hex[:6]}",
            "band_year": 2025,
            "gender": "male",
            "stam": f"TEST-STAM-{uuid.uuid4().hex[:6]}",
            "class_id": "1"
        }).json()
        
        # Update bird3 to add parents
        update_res = api_client.put(f"{BASE_URL}/api/birds/{bird3['id']}", json={
            "band_number": bird3['band_number'],
            "band_year": bird3['band_year'],
            "gender": bird3['gender'],
            "stam": bird3['stam'],
            "class_id": bird3['class_id'],
            "parent_male_id": bird1['id'],
            "parent_female_id": bird2['id']
        })
        
        assert update_res.status_code == 200
        updated_bird = update_res.json()
        
        assert updated_bird['parent_male_id'] == bird1['id']
        assert updated_bird['parent_female_id'] == bird2['id']
        
        print("Bird parent fields updated successfully")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/birds/{bird3['id']}")
        api_client.delete(f"{BASE_URL}/api/birds/{bird2['id']}")
        api_client.delete(f"{BASE_URL}/api/birds/{bird1['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
