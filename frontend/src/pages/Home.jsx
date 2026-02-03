import React from 'react'
import { Link } from 'react-router-dom'
const Home = () => {
    return (
        <div>
            <div className='h-screen pt-8 bg-[url(https://images.unsplash.com/photo-1619059558110-c45be64b73ae?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8dHJhZmZpYyUyMGxpZ2h0fGVufDB8fDB8fHww)] bg-cover bg-bg-center flex justify-between flex-col items-start w-full bg-red-400'>


                <img className='w-20 h-8 ml-8' src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Uber_logo_2018.png/1280px-Uber_logo_2018.png" alt="" />

                <div className='font-bold text-2xl bg-white w-full px-5 py-10'>

                    <h1 className='font-bold text-4xl pl-28 pb-5'>Get Started with Uber</h1>
                    <Link to="/user/login" className='flex justify-center bg-black text-white w-full 
                    py-3 rounded-md mt-3'>Continue</Link>



                </div>

            </div>
        </div>
    )
}

export default Home