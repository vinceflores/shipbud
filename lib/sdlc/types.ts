import { Component } from "react"



// Requiremtns 
type Requirement = { 
    id: string
    name: string 
    description: string
    priority: number  //  1 being highest
} 

type FunctionalRequirement = Requirement
type NonFunctionalRequirement = Requirement

type ReqConstraint = {
    id: string
    req: Requirement
    constraint: string
}

// Design
type SoftwareComponent = {
    id: string
    route: string ; // /api/project/new | /dashboard
}

type APIRoutes = SoftwareComponent
type UIRoute  = SoftwareComponent

type DesignDoc = {
    projectName: string
    overview: string
    purpose: string
    backgroundReading: string
    requirements: Requirement[]
    apiRoutes: APIRoutes[]
    ui: UIRoute[]
    tests: TestSuite[]
}

type RTM = {
    title: string
    entries: RTMEntry[]
}

type RTMEntry = {
    requirement: Requirement
    description: string
    status: 'DONE' | 'CANCELLED' | 'INPROGRESS'
    test: TestCase[]
    component: Component
}

// Test
type TestSuite = {
    id: string
    description: string
    component: SoftwareComponent
    testCases: TestCase[]
}

type TestCase = {
    id: string
    description: string
    actual: string | number | boolean
    expected:string | number | boolean
}
