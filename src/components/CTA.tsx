import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Simplify Your Scheduling?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of teams already using UmpireScheduler to manage their games professionally and efficiently.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white hover:bg-white/90 text-primary text-lg px-8 py-6">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6">
              Schedule a Demo
              <Calendar className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <p className="text-white/70 mt-6 text-sm">
            No credit card required • Free 30-day trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
