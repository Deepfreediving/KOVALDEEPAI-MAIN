/**
 * Legal Waiver and Medical Forms API
 * Handles liability waiver and medical clearance forms
 */

import { getAdminClient } from '@/lib/supabase'

export default async function handler(req, res) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGetForms(req, res)
    case 'POST':
      return handleSubmitForms(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetForms(req, res) {
  try {
    const legalWaiver = {
      title: "KOVAL DEEP AI – RELEASE OF LIABILITY, ASSUMPTION OF RISK, AND DISCLAIMER AGREEMENT",
      content: `PLEASE READ CAREFULLY. THIS IS A LEGALLY BINDING AGREEMENT. BY ACCESSING OR USING THE KOVAL DEEP AI CHATBOT ("THE AI SERVICE"), YOU AGREE TO BE LEGALLY BOUND BY THE TERMS BELOW.

This Release of Liability and Disclaimer Agreement ("Agreement") is entered into by and between you ("User", "Participant", or "You") and Koval Deep AI, Daniel Koval, Freediving Instructors International LLC and Deep Freediving Instruction LLC (collectively, "Providers") as a condition of accessing and using the AI-based freediving chatbot and related services (the "Service").

1. NO MEDICAL OR SAFETY GUARANTEE
The information provided by Koval Deep AI is not a substitute for formal freediving education, medical advice, or supervision. This chatbot provides generalized training guidance for educational purposes only. Freediving is a high-risk activity that can result in serious injury or death. You understand and agree that:
• The AI does not evaluate individual health conditions or emergency preparedness.
• You must not rely on the AI in place of certified freediving instruction or in-water supervision.
• Use of the chatbot's advice without proper physical readiness, certified training, or supervision may result in serious bodily injury, blackout, barotrauma, or death.

2. ASSUMPTION OF RISK
You voluntarily assume all risks associated with freediving training, preparation, or simulation, including but not limited to:
• Blackout (loss of consciousness)
• Shallow or deep-water blackout
• Lung squeeze or barotrauma
• Ear or sinus injury
• Death due to hypoxia, entrapment, or drowning

You acknowledge that no AI system, chatbot, or online resource can mitigate or remove these risks. Your decision to practice techniques suggested by Koval Deep AI is at your sole and exclusive risk.

3. WAIVER AND RELEASE OF LIABILITY
To the fullest extent permitted by law, you hereby release, waive, and discharge:
• Koval Deep AI
• Daniel Koval
• Deep Freediving Instruction LLC
• All officers, agents, employees, affiliates, contractors, AI platforms (including OpenAI), successors, and assigns from any and all liability, claims, demands, or causes of action whatsoever arising out of or related to your access to or use of the chatbot.

4. NO WARRANTIES
The Providers make no representations or warranties, express or implied, about the safety, effectiveness, or accuracy of the information provided. The Service is provided "as is" without warranty of any kind.

5. INDEMNIFICATION
You agree to indemnify, defend, and hold harmless the Released Parties from any claims, damages, losses, or expenses (including attorney's fees) arising out of or related to your use of the Service.

6. AGE AND LEGAL CAPACITY
You confirm that you are at least 18 years of age, or the legal age of majority in your jurisdiction.

7. GOVERNING LAW AND JURISDICTION
This Agreement shall be governed by the laws of the State of Hawaii.

8. ENTIRE AGREEMENT
This document constitutes the entire agreement between you and the Providers regarding your use of the Koval Deep AI service.

9. ACKNOWLEDGMENT
By using the Koval Deep AI chatbot, you affirm that you have read and understood this Release of Liability and that you voluntarily agree to be bound by its terms.`
    }

    const medicalForm = {
      title: "Koval Deep AI – Medical and Liability Release",
      content: `By checking the box below, you confirm the following:

You do NOT have any history of:
• Ear or sinus surgery
• Chronic sinus congestion
• Asthma, chronic bronchitis, or any lung condition
• Fainting, seizures, blackouts, or neurological conditions
• Diabetes (Type 1 or 2)
• Heart disease, arrhythmia, or high blood pressure
• Panic attacks or claustrophobia
• Blood disorders
• Recent major surgery or hospitalization
• Pregnancy (if applicable)

You understand that:
• Freediving carries serious risk, including blackout, barotrauma, lung squeeze, and death.
• Koval Deep AI provides general training guidance only and is not a substitute for professional medical or dive supervision.
• You are solely responsible for how you apply the information provided by the AI.
• You will never train in water without a certified buddy or instructor present.
• If any discomfort, dizziness, or symptoms arise, you will immediately stop training and seek medical evaluation.`,
      questions: [
        { id: 'earSurgery', text: 'Have you had ear or sinus surgery?', type: 'boolean' },
        { id: 'sinusCongestion', text: 'Do you have chronic sinus congestion?', type: 'boolean' },
        { id: 'lungCondition', text: 'Do you have asthma, chronic bronchitis, or any lung condition?', type: 'boolean' },
        { id: 'neurologicalCondition', text: 'Have you experienced fainting, seizures, blackouts, or neurological conditions?', type: 'boolean' },
        { id: 'diabetes', text: 'Do you have diabetes (Type 1 or 2)?', type: 'boolean' },
        { id: 'heartCondition', text: 'Do you have heart disease, arrhythmia, or high blood pressure?', type: 'boolean' },
        { id: 'panicAttacks', text: 'Do you experience panic attacks or claustrophobia?', type: 'boolean' },
        { id: 'bloodDisorders', text: 'Do you have any blood disorders?', type: 'boolean' },
        { id: 'recentSurgery', text: 'Have you had recent major surgery or hospitalization?', type: 'boolean' },
        { id: 'pregnancy', text: 'Are you currently pregnant? (if applicable)', type: 'boolean' },
        { id: 'emergencyContact', text: 'Emergency Contact (Name and Phone)', type: 'text' },
        { id: 'physicianContact', text: 'Primary Physician Contact (optional)', type: 'text' }
      ]
    }

    res.status(200).json({
      legalWaiver,
      medicalForm,
      documentUrl: '/kovalai%20libility%20and%20medical%20release.docx'
    })

  } catch (error) {
    console.error('Get forms error:', error)
    res.status(500).json({ error: 'Failed to get forms', details: error.message })
  }
}

async function handleSubmitForms(req, res) {
  try {
    const { 
      userId, 
      legalWaiverAccepted, 
      medicalFormAnswers, 
      medicalClearanceAccepted,
      ipAddress,
      userAgent 
    } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' })
    }

    if (!legalWaiverAccepted || !medicalClearanceAccepted) {
      return res.status(400).json({ 
        error: 'Both legal waiver and medical clearance must be accepted' 
      })
    }

    // Check for any disqualifying medical conditions
    const disqualifyingConditions = [
      'earSurgery', 'sinusCongestion', 'lungCondition', 'neurologicalCondition',
      'diabetes', 'heartCondition', 'panicAttacks', 'bloodDisorders', 
      'recentSurgery', 'pregnancy'
    ]

    const hasDisqualifyingCondition = disqualifyingConditions.some(
      condition => medicalFormAnswers[condition] === true
    )

    const supabase = getAdminClient()

    // Store legal documents
    const { error: legalError } = await supabase
      .from('legal_documents')
      .insert({
        user_id: userId,
        document_type: 'liability_waiver',
        accepted: true,
        accepted_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        document_version: '1.0'
      })

    if (legalError) {
      return res.status(400).json({ 
        error: 'Failed to store legal waiver',
        details: legalError.message 
      })
    }

    const { error: medicalError } = await supabase
      .from('legal_documents')
      .insert({
        user_id: userId,
        document_type: 'medical_clearance',
        accepted: true,
        accepted_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        document_version: '1.0',
        form_data: medicalFormAnswers
      })

    if (medicalError) {
      return res.status(400).json({ 
        error: 'Failed to store medical clearance',
        details: medicalError.message 
      })
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        legal_waiver_accepted: true,
        legal_waiver_date: new Date().toISOString(),
        medical_clearance_accepted: true,
        medical_clearance_date: new Date().toISOString(),
        medical_cleared: !hasDisqualifyingCondition,
        emergency_contact: medicalFormAnswers.emergencyContact,
        physician_contact: medicalFormAnswers.physicianContact
      })
      .eq('user_id', userId)

    if (profileError) {
      return res.status(400).json({ 
        error: 'Failed to update user profile',
        details: profileError.message 
      })
    }

    res.status(200).json({
      success: true,
      medicalCleared: !hasDisqualifyingCondition,
      message: hasDisqualifyingCondition 
        ? 'Forms submitted. Please consult with a physician before using the service.'
        : 'Forms submitted successfully. You are cleared to use the service.'
    })

  } catch (error) {
    console.error('Submit forms error:', error)
    res.status(500).json({ 
      error: 'Failed to submit forms',
      details: error.message 
    })
  }
}
