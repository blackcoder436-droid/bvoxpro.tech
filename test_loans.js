// Quick test script to verify loan records API
const mongoose = require('mongoose');
const Loan = require('./models/Loan');

// Get MongoDB URI from environment or use default
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bvox';

async function testLoans() {
    try {
        // Connect to MongoDB
        await mongoose.connect(mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        const userid = '1765298563993';
        
        // Check existing loans for the user
        const existingLoans = await Loan.find({ user_id: userid });
        console.log(`Found ${existingLoans.length} existing loans for user ${userid}`);
        
        if (existingLoans.length === 0) {
            console.log('\nNo loans found. Creating sample loan...');
            
            const sampleLoan = new Loan({
                id: `loan_${Date.now()}`,
                user_id: userid,
                amount: 1000,
                interest_rate: 5,
                duration_days: 30,
                total_repay: 1050,
                status: 'active',
                created_at: new Date(),
                updated_at: new Date()
            });
            
            const saved = await sampleLoan.save();
            console.log('Sample loan created:', saved);
        } else {
            console.log('\nExisting loans:', existingLoans);
        }

        // Test the API response format
        const loans = await Loan.find({ user_id: userid }).sort({ created_at: -1 });
        const formattedRecords = loans.map(loan => ({
            id: loan.id || loan._id,
            user_id: loan.user_id || loan.userid,
            amount: Number(loan.amount) || 0,
            interest_rate: Number(loan.interest_rate) || 0,
            duration_days: Number(loan.duration_days) || 0,
            total_repay: Number(loan.total_repay) || 0,
            status: loan.status || 'pending',
            created_at: loan.created_at || new Date().toISOString(),
            updated_at: loan.updated_at || new Date().toISOString()
        }));
        
        console.log('\nFormatted response that API would return:');
        console.log(JSON.stringify({
            code: 1,
            data: {
                edu: 1000,
                total_jine: loans.reduce((s, r) => s + (Number(r.amount) || 0), 0),
                total_weihuan: loans.filter(r => !['completed', 'repaid', 'redeemed', 'returned'].includes((r.status || '').toLowerCase())).reduce((s, r) => s + (Number(r.amount) || 0), 0),
                records: formattedRecords
            }
        }, null, 2));

        await mongoose.disconnect();
        console.log('\nTest completed successfully');
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

testLoans();
