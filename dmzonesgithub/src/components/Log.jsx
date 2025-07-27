import React from 'react';

export default function Log({ logs }) {
    return (
        <div style={{ marginTop: '1rem', height: '200px', overflowY: 'scroll', border: '1px solid gray' }}>
            {logs.map((log, i) => (
                <div key={i}>{log}</div>
            ))}
        </div>
    );
}
