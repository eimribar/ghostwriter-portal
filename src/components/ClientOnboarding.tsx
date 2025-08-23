// =====================================================
// CLIENT ONBOARDING COMPONENT
// Step-by-step wizard for creating new clients
// =====================================================

import React, { useState } from 'react';
import { Check, ChevronRight, User, Building, Mail, Globe, Settings, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clientInvitationService } from '../services/client-invitation.service';
import toast from 'react-hot-toast';

interface ClientOnboardingProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface OnboardingData {
  // Basic Information
  name: string;
  email: string;
  company: string;
  role: string;
  phone?: string;
  
  // LinkedIn Details
  linkedin_url: string;
  linkedin_bio?: string;
  
  // Content Preferences
  industry: string;
  posting_frequency: string;
  content_tone: string[];
  content_topics: string[];
  content_formats: string[];
  avoid_topics: string[];
  
  // Portal Access (always enabled for SSO)
  portal_access: boolean;
  send_invitation: boolean;
}

const STEPS = [
  { id: 1, title: 'Basic Information', icon: User },
  { id: 2, title: 'Company Details', icon: Building },
  { id: 3, title: 'LinkedIn Profile', icon: Globe },
  { id: 4, title: 'Content Preferences', icon: Settings },
  { id: 5, title: 'Portal Access', icon: Mail },
  { id: 6, title: 'Review & Send', icon: Send },
];

const TONE_OPTIONS = [
  'Professional', 'Casual', 'Technical', 'Inspirational', 
  'Educational', 'Conversational', 'Authoritative', 'Friendly'
];

const TOPIC_OPTIONS = [
  'AI & Technology', 'Leadership', 'Innovation', 'Marketing',
  'Sales', 'Product Management', 'Entrepreneurship', 'Data Science',
  'Digital Transformation', 'Team Building', 'Career Growth', 'Industry Trends'
];

const FORMAT_OPTIONS = [
  'Thought Leadership', 'Tips & Tricks', 'Case Studies', 'How-to Guides',
  'Industry News', 'Personal Stories', 'Data Insights', 'Predictions'
];

export const ClientOnboarding: React.FC<ClientOnboardingProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    email: '',
    company: '',
    role: '',
    phone: '',
    linkedin_url: '',
    linkedin_bio: '',
    industry: '',
    posting_frequency: '3 times per week',
    content_tone: [],
    content_topics: [],
    content_formats: [],
    avoid_topics: [],
    portal_access: true, // Always enabled for SSO
    send_invitation: true, // Always send invitation
  });

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: keyof OnboardingData, item: string) => {
    setData(prev => {
      const array = prev[field] as string[];
      const newArray = array.includes(item)
        ? array.filter(i => i !== item)
        : [...array, item];
      return { ...prev, [field]: newArray };
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(data.name && data.email && data.company && data.role);
      case 2:
        return !!(data.industry);
      case 3:
        return !!(data.linkedin_url);
      case 4:
        return data.content_tone.length > 0 && data.content_topics.length > 0;
      case 5:
        return true; // Portal access is optional
      case 6:
        return true; // Review step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare the client data
      const clientData = {
        name: data.name,
        email: data.email,
        company: data.company,
        role: data.role,
        phone: data.phone || null,
        linkedin_url: data.linkedin_url,
        linkedin_bio: data.linkedin_bio || null,
        industry: data.industry,
        posting_frequency: data.posting_frequency,
        content_preferences: {
          tone: data.content_tone,
          topics: data.content_topics,
          formats: data.content_formats,
          avoid: data.avoid_topics,
        },
        status: 'active',
        portal_access: true, // Always enabled for SSO
        invitation_status: 'pending', // Set initial invitation status
        auth_status: 'not_invited', // Set initial auth status
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Attempting to create client with data:', clientData);

      // Create the client in the database
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (clientError) {
        console.error('Supabase error creating client:', clientError);
        
        // Check for RLS policy error
        if (clientError.message?.includes('row-level security') || clientError.code === '42501') {
          throw new Error('Database permissions error. Please run the fix_clients_rls_policy.sql script in Supabase SQL Editor.');
        }
        
        throw clientError;
      }

      // Always send SSO invitation for new clients
      if (newClient && data.send_invitation) {
        console.log('🎯 Sending SSO invitation to client:', newClient.id);
        
        const invitationResult = await clientInvitationService.sendInvitation(newClient.id);
        
        if (invitationResult.success) {
          console.log('✅ Invitation sent successfully');
          toast.success('Invitation sent! Client will receive SSO signup instructions.');
        } else {
          console.error('❌ Failed to send invitation:', invitationResult.error);
          toast.error(`Invitation failed: ${invitationResult.error}`);
        }
      }

      toast.success(`Successfully onboarded ${data.name}!`);
      onComplete();
      
    } catch (error: any) {
      console.error('Error creating client:', error);
      
      // Show more specific error messages
      if (error?.message) {
        toast.error(`Error: ${error.message}`);
      } else if (error?.details) {
        toast.error(`Error: ${error.details}`);
      } else if (error?.code) {
        toast.error(`Database error (${error.code}): Please check your data and try again.`);
      } else {
        toast.error('Failed to create client. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-zinc-100">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={data.name}
                onChange={e => updateData('name', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={data.email}
                onChange={e => updateData('email', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
                placeholder="john@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Company *
              </label>
              <input
                type="text"
                value={data.company}
                onChange={e => updateData('company', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Role/Title *
              </label>
              <input
                type="text"
                value={data.role}
                onChange={e => updateData('role', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
                placeholder="CEO & Founder"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={data.phone}
                onChange={e => updateData('phone', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-zinc-100">Company Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Industry *
              </label>
              <select
                value={data.industry}
                onChange={e => updateData('industry', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Industry</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Marketing">Marketing</option>
                <option value="Consulting">Consulting</option>
                <option value="Education">Education</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Posting Frequency
              </label>
              <select
                value={data.posting_frequency}
                onChange={e => updateData('posting_frequency', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="Daily">Daily</option>
                <option value="3 times per week">3 times per week</option>
                <option value="2 times per week">2 times per week</option>
                <option value="Weekly">Weekly</option>
                <option value="Bi-weekly">Bi-weekly</option>
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-zinc-100">LinkedIn Profile</h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                LinkedIn Profile URL *
              </label>
              <input
                type="url"
                value={data.linkedin_url}
                onChange={e => updateData('linkedin_url', e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                LinkedIn Bio (Optional)
              </label>
              <textarea
                value={data.linkedin_bio}
                onChange={e => updateData('linkedin_bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
                placeholder="Brief description from LinkedIn profile..."
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-zinc-100">Content Preferences</h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Content Tone * (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map(tone => (
                  <button
                    key={tone}
                    onClick={() => toggleArrayItem('content_tone', tone.toLowerCase())}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      data.content_tone.includes(tone.toLowerCase())
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Content Topics * (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TOPIC_OPTIONS.map(topic => (
                  <button
                    key={topic}
                    onClick={() => toggleArrayItem('content_topics', topic.toLowerCase())}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      data.content_topics.includes(topic.toLowerCase())
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                Content Formats (Select multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map(format => (
                  <button
                    key={format}
                    onClick={() => toggleArrayItem('content_formats', format.toLowerCase())}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      data.content_formats.includes(format.toLowerCase())
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Topics to Avoid (Optional)
              </label>
              <input
                type="text"
                value={data.avoid_topics.join(', ')}
                onChange={e => updateData('avoid_topics', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-blue-500 focus:outline-none"
                placeholder="Politics, Religion, Controversial topics..."
              />
              <p className="text-xs text-zinc-500 mt-1">Separate with commas</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-zinc-100">SSO Portal Access</h3>
            
            <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-medium text-blue-400">Modern SSO Authentication</h4>
              </div>
              <p className="text-sm text-zinc-300">
                This client will receive secure SSO (Single Sign-On) access with support for Google, GitHub, and email authentication.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div>
                  <span className="text-zinc-300 font-medium">Portal Access</span>
                  <p className="text-sm text-zinc-500">Client portal with approval interface</p>
                </div>
                <div className="text-green-400 font-medium">✓ Enabled</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div>
                  <span className="text-zinc-300 font-medium">SSO Invitation</span>
                  <p className="text-sm text-zinc-500">Email invitation with secure signup link</p>
                </div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.send_invitation}
                    onChange={e => updateData('send_invitation', e.target.checked)}
                    className="w-5 h-5 bg-zinc-900 border-zinc-700 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-zinc-300">Send Now</span>
                </label>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-3">What happens next?</h4>
              <ul className="text-sm text-zinc-500 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">1.</span>
                  <span>Invitation email sent to <strong className="text-zinc-300">{data.email}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">2.</span>
                  <span>Client clicks invitation link and chooses authentication method</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">3.</span>
                  <span>Client gains access to beautiful approval portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">4.</span>
                  <span>You can impersonate client for debugging if needed</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-zinc-100">Review & Confirm</h3>
            
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Basic Information</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Name:</dt>
                    <dd className="text-zinc-300">{data.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Email:</dt>
                    <dd className="text-zinc-300">{data.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Company:</dt>
                    <dd className="text-zinc-300">{data.company}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Role:</dt>
                    <dd className="text-zinc-300">{data.role}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Content Preferences</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Industry:</dt>
                    <dd className="text-zinc-300">{data.industry}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Frequency:</dt>
                    <dd className="text-zinc-300">{data.posting_frequency}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 mb-1">Tone:</dt>
                    <dd className="text-zinc-300">{data.content_tone.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 mb-1">Topics:</dt>
                    <dd className="text-zinc-300">{data.content_topics.join(', ')}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">SSO Portal Access</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Portal Access:</dt>
                    <dd className="text-green-400 font-medium">✓ SSO Enabled</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Authentication:</dt>
                    <dd className="text-zinc-300">Google, GitHub, Email</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Send Invitation:</dt>
                    <dd className="text-zinc-300">{data.send_invitation ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Admin Control:</dt>
                    <dd className="text-blue-400">Impersonation Available</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-800 p-6">
          <h2 className="text-2xl font-bold text-zinc-100">Client Onboarding</h2>
          <p className="text-zinc-500 mt-1">Add a new client to the platform</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`ml-3 text-sm font-medium hidden md:block ${
                      isActive ? 'text-zinc-100' : 'text-zinc-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-zinc-700 mx-2" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 240px)' }}>
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-6 flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
            )}
            
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? 'Creating...' : 'Create Client'}
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientOnboarding;