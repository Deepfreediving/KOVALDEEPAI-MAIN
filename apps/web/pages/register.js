import { useState } from 'react'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    certificationLevel: 'none',
    emergencyContact: '',
    medicalHistory: '',
    legalWaiverAccepted: false,
    medicalClearanceAccepted: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`Success! ${result.message}`)
        // Redirect to login or dashboard
        window.location.href = '/login'
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
        KovalAI Freediving Registration
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Basic Information</h2>
          
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
          
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
          
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
          />
          
          <select
            name="certificationLevel"
            value={formData.certificationLevel}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
          >
            <option value="none">No Certification</option>
            <option value="L1">Level 1</option>
            <option value="L2">Level 2</option>
            <option value="L3">Level 3</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>

        {/* Emergency Contact */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Emergency Contact</h2>
          <textarea
            name="emergencyContact"
            placeholder="Emergency contact information (name, phone, relationship)"
            value={formData.emergencyContact}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            rows="3"
          />
        </div>

        {/* Medical History */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Medical History</h2>
          <textarea
            name="medicalHistory"
            placeholder="Any relevant medical conditions or medications"
            value={formData.medicalHistory}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            rows="3"
          />
        </div>

        {/* Legal Agreements */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600">Legal Agreements (Required)</h2>
          
          <div className="space-y-2">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                name="legalWaiverAccepted"
                checked={formData.legalWaiverAccepted}
                onChange={handleChange}
                required
                className="mt-1"
              />
              <span className="text-sm">
                <strong>I accept the Liability Waiver and Release Agreement.</strong>
                <br />
                I understand that freediving carries serious risks including blackout, barotrauma, 
                and death. I voluntarily assume all risks and release KovalAI and its providers 
                from all liability.
              </span>
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                name="medicalClearanceAccepted"
                checked={formData.medicalClearanceAccepted}
                onChange={handleChange}
                required
                className="mt-1"
              />
              <span className="text-sm">
                <strong>I confirm my medical clearance.</strong>
                <br />
                I confirm that I do NOT have any history of ear/sinus surgery, asthma, 
                heart conditions, diabetes, seizures, or other conditions that would 
                make freediving unsafe.
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.legalWaiverAccepted || !formData.medicalClearanceAccepted}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold disabled:bg-gray-400"
        >
          {isLoading ? 'Creating Account...' : 'Register for KovalAI'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account? 
          <a href="/login" className="text-blue-600 hover:underline ml-1">Login here</a>
        </p>
      </div>
    </div>
  )
}
