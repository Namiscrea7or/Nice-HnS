import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './User.css';

const User = () => {
    const history = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/user/info', {
                    headers: { Authorization: localStorage.getItem('Saved Token') },
                });

                console.log(response.data);
                setUserData(response.data);
            } catch (error) {
                console.error('Error fetching data:', error.response?.status, error.response?.data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!userData) {
        return <div>Error loading data</div>;
    }

    const {
        success,
        email,
        full_name,
        address,
        birthday,
        user_id,
        role,
        createAt,
        salary,
    } = userData;

    const handleLogout = () => {
        localStorage.removeItem('Saved Token');
        history('/log');
    };

    if (role === 'System_Admin') {
        history('/System_Admin');
    }

    return (
        <div className="user">
            <div className="employee-card">
            <h1 id="employeeInfo">User Information</h1>
                <div className='user-detail'>
                    <img /*src={require(`./img/${user_id}.jpg`)}*/ src={require('./img/123456789874.jpg')} alt="user_image" />
                    <div className="employee-details">
                        <h2 id="employee-name"><span>Name:</span> {full_name}</h2>
                        <p id="employee-position"><span>ID:</span> {user_id}</p>
                        <p id="email"><span>Email:</span> {email}</p>
                        <p className="birthday"><span>Date of birth:</span> {birthday}</p>
                        <p className="address"><span>Address:</span> {address}</p>
                        <p className="role"><span>Role:</span> {role}</p>
                        {role === 'staff' && <p className="salary"><span>Salary:</span> {salary}</p>}
                        <p className="create"><span>Start at:</span> {createAt}</p>
                    </div>
                </div>

                <button className="logout" onClick={handleLogout}>
                    Log out
                </button>
            </div>
        </div>
    );
};

export default User;
