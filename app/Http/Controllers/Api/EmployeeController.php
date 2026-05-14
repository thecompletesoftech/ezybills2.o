<?php

namespace App\Http\Controllers\Api;

class EmployeeController extends Controller
{
    public function index()
    {
        return $this->success([], 'Employees retrieved');
    }

    public function store()
    {
        return $this->success([], 'Employee created', 201);
    }

    public function show()
    {
        return $this->success([], 'Employee retrieved');
    }

    public function update()
    {
        return $this->success([], 'Employee updated');
    }

    public function destroy()
    {
        return $this->success([], 'Employee deleted');
    }
}
