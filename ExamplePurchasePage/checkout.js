// Function to create and handle the checkout form
let ischeckingout=false;
async function checkout(order){
    console.log("shit")
    if(ischeckingout) return;
    ischeckingout = true;
    const jwt = localStorage.getItem('jwt');
    const response = await fetch('https://rszdhljwuawhbvsrtwmm.supabase.co/functions/v1/create-stripe-session', {
    // const response = await fetch('http://localhost:54321/functions/v1/create-stripe-session', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
            order:order,
            config: config
        })
    });
    const { sessionId } = await response.json();
    const stripe = Stripe('pk_test_51RHTogGadlO3mSerUASbufKIDRDqbpymrZcmOhbv6HbTHBFVCysu0SMSyk1WTUyw3NDWi8OBGjNH9qUPpozmpK4500EJGU7xp8',
        {stripeAccount: "acct_1RHqbHLE51haQuew"}
    ); // Replace with your key
    console.log({sessionId})
    setTimeout(()=>stripe.redirectToCheckout({ sessionId }), 0);
}

