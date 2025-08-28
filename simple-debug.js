// 🔍 EINFACHES DEBUG-SCRIPT: Zeigt User aus DataSource
console.log('🔍 Starte EINFACHES DEBUG...');

const axios = require('axios');

async function testAPI() {
  try {
    console.log('📡 Rufe /api/data/users auf...');
    
    const response = await axios.get('http://localhost:5000/api/data/users?source=all&department=entfeuchtung', {
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log(`✅ Gefunden: ${response.data.data.length} User`);
      
      const users = response.data.data;
      const departmentStats = {};
      const entfeuchtungUsers = [];
      
      users.forEach(user => {
        const dept = user.sourceData?.department || user.department || 'UNKNOWN';
        departmentStats[dept] = (departmentStats[dept] || 0) + 1;
        
        if (dept.toLowerCase().includes('entfeuchtung')) {
          entfeuchtungUsers.push({
            name: user.sourceData?.displayName || user.name || user.email,
            email: user.email,
            department: dept,
            source: user.source
          });
        }
      });
      
      console.log('\n📊 TOP 10 DEPARTMENTS:');
      Object.entries(departmentStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([dept, count]) => {
          console.log(`   ${dept}: ${count} User`);
        });
        
      console.log('\n🏢 ENTFEUCHTUNG-USER GEFUNDEN:', entfeuchtungUsers.length);
      entfeuchtungUsers.forEach(user => {
        console.log(`   👤 ${user.name} (${user.email}) - Dept: "${user.department}" [${user.source}]`);
      });
      
    } else {
      console.log('❌ API-Fehler:', response.data.message);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend ist nicht erreichbar. Starte Backend mit: npm run dev');
    } else {
      console.log('❌ Fehler:', error.message);
    }
  }
}

testAPI();
