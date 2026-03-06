import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        className="max-w-sm w-full space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-lg">U</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          <p className="text-sm text-muted-foreground">Continue to UPSC Engine</p>
        </div>

        <div className="space-y-3">
          <Input placeholder="Email" type="email" className="h-11" />
          <Input placeholder="Password" type="password" className="h-11" />
          <Button className="w-full h-11 bg-primary text-primary-foreground" onClick={() => navigate("/")}>
            Sign In
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Auth will be connected to Lovable Cloud in Step 2
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
