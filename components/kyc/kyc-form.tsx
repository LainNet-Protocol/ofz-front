"use client"

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWeb3 } from "@/providers/web3-provider";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Upload, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";

const formSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  nationality: z.string().min(2, "Please select your nationality"),
  documentType: z.enum(["passport", "nationalID", "driverLicense"]),
  documentFile: z.instanceof(FileList).refine(files => files.length > 0, "Please upload a document"),
});

export function KycForm() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const { 
    isConnected, 
    isSignedLicense, 
    submitKyc, 
    isKycSubmitted, 
    kycStatus, 
    checkWhitelistStatus
  } = useWeb3();
  const { toast } = useToast();
  const router = useRouter();
  
  // Create useRef outside of useEffect
  const initialCheckDone = useRef(false);
  
  // Check whitelist status when the component mounts if the user is connected
  useEffect(() => {
    // Only run this once on mount
    const checkWhitelist = async () => {
      // Skip if already checked or if prerequisites not met
      if (initialCheckDone.current || !isConnected || !isSignedLicense) {
        return;
      }
      
      initialCheckDone.current = true;
      console.log('KycForm: Performing initial whitelist check');
      
      try {
        const whitelistData = await checkWhitelistStatus();
        
        // If user is whitelisted with a valid expiration
        if (whitelistData.isValid) {
          toast({
            title: "Verification Status",
            description: "Your KYC verification has been approved via on-chain verification.",
            variant: "default",
          });
        }
        // Not starting polling here - let the verification status page handle that
      } catch (error) {
        console.error("Error checking whitelist status:", error);
      }
    };
    
    checkWhitelist();
    
  // Only run on mount and unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      nationality: "",
      documentType: "passport",
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      form.setValue("documentFile", files);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    if (!isSignedLicense) {
      toast({
        title: "License not signed",
        description: "Please sign the license agreement first",
        variant: "destructive",
      });
      return;
    }
    
    // Simulate file upload
    setUploading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploading(false);
    
    // Submit KYC information
    setLoading(true);
    try {
      await submitKyc(values);
      toast({
        title: "KYC submitted successfully",
        description: "Your documents have been submitted for verification. We'll notify you when the verification is complete.",
        variant: "default",
      });
      
      // Add a small delay to allow toast to be visible
      setTimeout(() => {
        router.push('/verification');
      }, 1500);
    } catch (error) {
      console.error("Error submitting KYC:", error);
      toast({
        title: "Failed to submit KYC",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isKycSubmitted) {
    return (
      <Card className="p-6 bg-emerald-50 border-emerald-200">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h3 className="text-xl font-medium text-emerald-800">KYC Documents Submitted</h3>
          <p className="mt-2 text-emerald-600">
            {kycStatus === 'pending' 
              ? 'Your documents are currently being reviewed. This process typically takes 24-48 hours.' 
              : 'Your KYC verification has been approved.'}
          </p>
          <Button 
            className="mt-6 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => router.push('/verification')}
          >
            Check Verification Status
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!isConnected && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
            <h3 className="text-xl font-medium text-amber-800">Wallet Not Connected</h3>
            <p className="mt-2 text-amber-600">
              You need to connect your wallet before you can complete KYC verification.
            </p>
            <Button 
              className="mt-6 bg-amber-600 hover:bg-amber-700"
              onClick={() => router.push('/')}
            >
              Connect Wallet
            </Button>
          </div>
        </Card>
      )}
      
      {isConnected && !isSignedLicense && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
            <h3 className="text-xl font-medium text-amber-800">License Agreement Required</h3>
            <p className="mt-2 text-amber-600">
              You need to sign the license agreement before completing KYC verification.
            </p>
            <Button 
              className="mt-6 bg-amber-600 hover:bg-amber-700"
              onClick={() => router.push('/license')}
            >
              Go to License Agreement
            </Button>
          </div>
        </Card>
      )}
    
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your full legal name" 
                        {...field} 
                        disabled={!isConnected || !isSignedLicense}
                      />
                    </FormControl>
                    <FormDescription>
                      Name must match your identification document
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your nationality" 
                        {...field} 
                        disabled={!isConnected || !isSignedLicense}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter your country of citizenship
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!isConnected || !isSignedLicense}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="nationalID">National ID Card</SelectItem>
                        <SelectItem value="driverLicense">Driver's License</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="documentFile"
                render={() => (
                  <FormItem>
                    <FormLabel>Upload Document</FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors hover:border-emerald-300">
                        {!fileName ? (
                          <>
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              PDF, JPG, or PNG (max. 5MB)
                            </p>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={handleFileChange}
                              className="hidden"
                              id="document-upload"
                              disabled={!isConnected || !isSignedLicense}
                            />
                            <label 
                              htmlFor="document-upload" 
                              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Browse Files
                            </label>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                            <p className="text-sm font-medium text-gray-700">
                              {fileName}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setFileName("");
                                form.setValue("documentFile", undefined as any);
                              }}
                              className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
                              disabled={!isConnected || !isSignedLicense}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>
          
          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!isConnected || !isSignedLicense || loading || uploading}
          >
            {uploading ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                Uploading Files...
              </span>
            ) : loading ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
                Submitting KYC...
              </span>
            ) : (
              "Submit KYC"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}