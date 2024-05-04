import {
  Button,
  Heading,
  Image,
  Text,
  View,
  useAuthenticator,
  useTheme,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import logo from "../logo.png";

export const components = {
  Header() {
    const { tokens } = useTheme();

    return (
      <View textAlign="center" padding={tokens.space.large}>
        <Image
          alt="AWS RBC logo"
          src={logo}
          style={{ width: "90px", height: "90px" }}
        />
        <p className="text-xl">AWS RBS</p>
      </View>
    );
  },

  Footer() {
    const { tokens } = useTheme();

    return (
      <View textAlign="center" padding={tokens.space.large}>
        <Text color={tokens.colors.neutral[100]}>
          HexedSolutions 🪄 &copy; All Rights Reserved
        </Text>
      </View>
    );
  },

  SignIn: {
    Footer() {
      const { toForgotPassword } = useAuthenticator();

      return (
        <View textAlign="center">
          <Button
            fontWeight="normal"
            onClick={toForgotPassword}
            size="small"
            variation="link"
          >
            Forgot password?
          </Button>
        </View>
      );
    },
  },
  SetupTotp: {
    Header() {
      const { tokens } = useTheme();
      return (
        <Heading
          padding={`${tokens.space.xl} 0 0 ${tokens.space.xl}`}
          level={3}
        >
          Enter Information:
        </Heading>
      );
    },
  },
  ConfirmSignIn: {
    Header() {
      const { tokens } = useTheme();
      return (
        <Heading
          padding={`${tokens.space.xl} 0 0 ${tokens.space.xl}`}
          level={3}
        >
          Enter Information:
        </Heading>
      );
    },
  },
};

export const formFields = {
  signIn: {
    username: {
      placeholder: "example@gmail.com",
    },
    password: {
      placeholder: "***********",
    },
  },
  forceNewPassword: {
    password: {
      placeholder: "***********",
    },
  },
  forgotPassword: {
    username: {
      placeholder: "example@gmail.com",
    },
  },
  confirmResetPassword: {
    confirmation_code: {
      placeholder: "Enter your Confirmation Code",
      label: "Confirmation Code",
      isRequired: false,
    },
    confirm_password: {
      placeholder: "Confirm Password",
    },
  },
  setupTotp: {
    QR: {
      totpIssuer: "test issuer",
      totpUsername: "amplify_qr_test_user",
    },
    confirmation_code: {
      label: "Confirmation Code",
      placeholder: "Enter your Confirmation Code",
      isRequired: false,
    },
  },
  confirmSignIn: {
    confirmation_code: {
      label: "Confirmation Code",
      placeholder: "Enter your Confirmation Code:",
      isRequired: false,
    },
  },
};
