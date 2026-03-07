#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Canary Breeding Management App
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Any

class CanaryBreedingAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}  # Store created entities for cleanup and reference
        self.errors = []

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, params: Dict = None) -> tuple[bool, Dict]:
        """Run a single API test and return (success, response_data)"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        self.log(f"Testing {name}... ({method} {endpoint})")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name} (Status: {response.status_code})")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                error_msg = f"❌ FAILED - {name} (Expected {expected_status}, got {response.status_code})"
                if response.text:
                    error_msg += f" - Response: {response.text[:200]}"
                self.log(error_msg)
                self.errors.append(error_msg)
                return False, {}

        except Exception as e:
            error_msg = f"❌ ERROR - {name}: {str(e)}"
            self.log(error_msg)
            self.errors.append(error_msg)
            return False, {}

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        self.log("=== Testing Basic Connectivity ===")
        success, _ = self.run_test("API Root", "GET", "/", 200)
        return success

    def test_dashboard_apis(self):
        """Test dashboard-related endpoints"""
        self.log("=== Testing Dashboard APIs ===")
        
        # Test dashboard stats
        success1, stats = self.run_test("Dashboard Stats", "GET", "/dashboard/stats", 200)
        
        # Test dashboard tasks
        success2, tasks = self.run_test("Dashboard Tasks", "GET", "/dashboard/tasks", 200)
        
        if success1 and stats:
            self.log(f"Dashboard stats: {stats}")
            
        return success1 and success2

    def test_zones_workflow(self):
        """Test complete zones workflow"""
        self.log("=== Testing Zones Workflow ===")
        
        # 1. Get initial zones (should be empty)
        success, zones = self.run_test("Get Zones (Initial)", "GET", "/zones", 200)
        if not success:
            return False
            
        # 2. Create a new zone
        zone_data = {
            "name": "Test Zone 1",
            "rows": 3,
            "columns": 4
        }
        success, zone = self.run_test("Create Zone", "POST", "/zones", 200, zone_data)
        if not success:
            return False
            
        self.test_data['zone_id'] = zone.get('id')
        self.log(f"Created zone with ID: {self.test_data['zone_id']}")
        
        # 3. Get zone by ID
        if self.test_data.get('zone_id'):
            success, _ = self.run_test("Get Zone by ID", "GET", f"/zones/{self.test_data['zone_id']}", 200)
            if not success:
                return False
                
        # 4. Generate cages for the zone
        if self.test_data.get('zone_id'):
            success, result = self.run_test("Generate Cages", "POST", f"/zones/{self.test_data['zone_id']}/generate-cages", 200)
            if success and result:
                self.log(f"Generated {result.get('count', 0)} cages")
                
        # 5. Get cages for the zone
        success, cages = self.run_test("Get Cages", "GET", "/cages", 200, 
                                     params={'zone_id': self.test_data.get('zone_id')})
        if success and cages:
            self.test_data['cage_id'] = cages[0].get('id') if cages else None
            self.log(f"Found {len(cages)} cages")
            
        return True

    def test_birds_workflow(self):
        """Test complete birds workflow"""
        self.log("=== Testing Birds Workflow ===")
        
        # 1. Get initial birds
        success, birds = self.run_test("Get Birds (Initial)", "GET", "/birds", 200)
        if not success:
            return False
            
        # 2. Create a male bird
        male_bird_data = {
            "band_number": "TEST-M-001",
            "band_year": 2024,
            "gender": "male",
            "species": "Canary",
            "color": "Yellow",
            "notes": "Test male bird"
        }
        success, male_bird = self.run_test("Create Male Bird", "POST", "/birds", 200, male_bird_data)
        if not success:
            return False
            
        self.test_data['male_bird_id'] = male_bird.get('id')
        
        # 3. Create a female bird
        female_bird_data = {
            "band_number": "TEST-F-001", 
            "band_year": 2024,
            "gender": "female",
            "species": "Canary",
            "color": "Red",
            "notes": "Test female bird"
        }
        success, female_bird = self.run_test("Create Female Bird", "POST", "/birds", 200, female_bird_data)
        if not success:
            return False
            
        self.test_data['female_bird_id'] = female_bird.get('id')
        
        # 4. Get bird by ID
        if self.test_data.get('male_bird_id'):
            success, _ = self.run_test("Get Bird by ID", "GET", f"/birds/{self.test_data['male_bird_id']}", 200)
            if not success:
                return False
                
        # 5. Update bird
        if self.test_data.get('male_bird_id'):
            update_data = {**male_bird_data, "color": "Bright Yellow"}
            success, _ = self.run_test("Update Bird", "PUT", f"/birds/{self.test_data['male_bird_id']}", 200, update_data)
            if not success:
                return False
                
        # 6. Filter birds by gender
        success, male_birds = self.run_test("Filter Male Birds", "GET", "/birds", 200, params={"gender": "male"})
        success2, female_birds = self.run_test("Filter Female Birds", "GET", "/birds", 200, params={"gender": "female"})
        
        return success and success2

    def test_pairs_workflow(self):
        """Test complete pairs workflow"""
        self.log("=== Testing Pairs Workflow ===")
        
        # Check prerequisites
        if not self.test_data.get('cage_id') or not self.test_data.get('male_bird_id') or not self.test_data.get('female_bird_id'):
            self.log("❌ Missing prerequisites for pairs test (cage_id, male_bird_id, female_bird_id)")
            return False
            
        # 1. Get initial pairs
        success, pairs = self.run_test("Get Pairs (Initial)", "GET", "/pairs", 200)
        if not success:
            return False
            
        # 2. Create a breeding pair
        pair_data = {
            "name": "Test Pair 1",
            "cage_id": self.test_data['cage_id'],
            "male_id": self.test_data['male_bird_id'],
            "female_id": self.test_data['female_bird_id'],
            "notes": "Test breeding pair"
        }
        success, pair = self.run_test("Create Pair", "POST", "/pairs", 200, pair_data)
        if not success:
            return False
            
        self.test_data['pair_id'] = pair.get('id')
        
        # 3. Get pair by ID
        if self.test_data.get('pair_id'):
            success, _ = self.run_test("Get Pair by ID", "GET", f"/pairs/{self.test_data['pair_id']}", 200)
            if not success:
                return False
                
        # 4. Update pair
        if self.test_data.get('pair_id'):
            update_data = {"name": "Updated Test Pair", "notes": "Updated notes"}
            success, _ = self.run_test("Update Pair", "PUT", f"/pairs/{self.test_data['pair_id']}", 200, update_data)
            if not success:
                return False
                
        # 5. Get active pairs only
        success, active_pairs = self.run_test("Get Active Pairs", "GET", "/pairs", 200, params={"active_only": True})
        
        return success

    def test_clutches_workflow(self):
        """Test complete clutches workflow"""
        self.log("=== Testing Clutches Workflow ===")
        
        # Check prerequisites
        if not self.test_data.get('pair_id'):
            self.log("❌ Missing prerequisite for clutches test (pair_id)")
            return False
            
        # 1. Get initial clutches
        success, clutches = self.run_test("Get Clutches (Initial)", "GET", "/clutches", 200)
        if not success:
            return False
            
        # 2. Create a clutch
        clutch_data = {
            "pair_id": self.test_data['pair_id'],
            "notes": "Test clutch"
        }
        success, clutch = self.run_test("Create Clutch", "POST", "/clutches", 200, clutch_data)
        if not success:
            return False
            
        self.test_data['clutch_id'] = clutch.get('id')
        
        # 3. Add eggs to clutch
        if self.test_data.get('clutch_id'):
            for i in range(3):
                success, _ = self.run_test(f"Add Egg {i+1}", "POST", f"/clutches/{self.test_data['clutch_id']}/eggs", 200, {})
                if not success:
                    return False
                    
        # 4. Update clutch status to incubating
        if self.test_data.get('clutch_id'):
            today = datetime.now().strftime("%Y-%m-%d")
            update_data = {
                "status": "incubating",
                "incubation_start": today
            }
            success, _ = self.run_test("Start Incubation", "PUT", f"/clutches/{self.test_data['clutch_id']}", 200, update_data)
            if not success:
                return False
                
        # 5. Get clutches by pair
        success, pair_clutches = self.run_test("Get Clutches by Pair", "GET", "/clutches", 200, 
                                            params={"pair_id": self.test_data['pair_id']})
        
        # 6. Get clutches by status
        success2, incubating_clutches = self.run_test("Get Incubating Clutches", "GET", "/clutches", 200,
                                                   params={"status": "incubating"})
        
        return success and success2

    def test_contacts_workflow(self):
        """Test complete contacts workflow"""
        self.log("=== Testing Contacts Workflow ===")
        
        # 1. Get initial contacts
        success, contacts = self.run_test("Get Contacts (Initial)", "GET", "/contacts", 200)
        if not success:
            return False
            
        # 2. Create a contact
        contact_data = {
            "name": "Test Breeder",
            "breeder_number": "TB-001",
            "phone": "+1234567890",
            "email": "test@example.com",
            "address": "Test City, Test Country",
            "notes": "Test contact"
        }
        success, contact = self.run_test("Create Contact", "POST", "/contacts", 200, contact_data)
        if not success:
            return False
            
        self.test_data['contact_id'] = contact.get('id')
        
        # 3. Get contact by ID
        if self.test_data.get('contact_id'):
            success, _ = self.run_test("Get Contact by ID", "GET", f"/contacts/{self.test_data['contact_id']}", 200)
            if not success:
                return False
                
        # 4. Update contact
        if self.test_data.get('contact_id'):
            update_data = {**contact_data, "notes": "Updated notes"}
            success, _ = self.run_test("Update Contact", "PUT", f"/contacts/{self.test_data['contact_id']}", 200, update_data)
            if not success:
                return False
                
        return True

    def cleanup(self):
        """Clean up created test data"""
        self.log("=== Cleaning Up Test Data ===")
        
        # Delete in reverse order of dependencies
        if self.test_data.get('contact_id'):
            self.run_test("Delete Contact", "DELETE", f"/contacts/{self.test_data['contact_id']}", 200)
            
        if self.test_data.get('clutch_id'):
            self.run_test("Delete Clutch", "DELETE", f"/clutches/{self.test_data['clutch_id']}", 200)
            
        if self.test_data.get('pair_id'):
            self.run_test("Delete Pair", "DELETE", f"/pairs/{self.test_data['pair_id']}", 200)
            
        if self.test_data.get('male_bird_id'):
            self.run_test("Delete Male Bird", "DELETE", f"/birds/{self.test_data['male_bird_id']}", 200)
            
        if self.test_data.get('female_bird_id'):
            self.run_test("Delete Female Bird", "DELETE", f"/birds/{self.test_data['female_bird_id']}", 200)
            
        if self.test_data.get('zone_id'):
            self.run_test("Delete Zone", "DELETE", f"/zones/{self.test_data['zone_id']}", 200)

    def run_all_tests(self):
        """Run all test workflows"""
        self.log("🧪 Starting Canary Breeding Management API Tests")
        self.log("=" * 60)
        
        try:
            # Test basic connectivity first
            if not self.test_basic_connectivity():
                self.log("❌ Basic connectivity failed, stopping tests")
                return False
                
            # Test dashboard APIs
            self.test_dashboard_apis()
            
            # Run workflow tests in dependency order
            if not self.test_zones_workflow():
                self.log("❌ Zones workflow failed")
                
            if not self.test_birds_workflow():
                self.log("❌ Birds workflow failed")
                
            if not self.test_pairs_workflow():
                self.log("❌ Pairs workflow failed")
                
            if not self.test_clutches_workflow():
                self.log("❌ Clutches workflow failed")
                
            if not self.test_contacts_workflow():
                self.log("❌ Contacts workflow failed")
                
        finally:
            # Always cleanup
            self.cleanup()
            
        # Print final results
        self.log("=" * 60)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.errors:
            self.log("\n❌ Failed Tests:")
            for error in self.errors:
                self.log(f"   {error}")
                
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    # Use the public backend URL from frontend .env
    BASE_URL = "https://task-first-1.preview.emergentagent.com"
    
    print(f"🎯 Testing Canary Breeding Management API at: {BASE_URL}")
    
    tester = CanaryBreedingAPITester(BASE_URL)
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())